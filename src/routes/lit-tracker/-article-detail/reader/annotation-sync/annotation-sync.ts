import type { AnnotationEvent } from '@embedpdf/plugin-annotation'
import type { AnnotationRow, SyncedAnnotation } from './annotation-row'
import { toRow } from './annotation-row'

/**
 * What to write to the database when the engine reports a change, and what to
 * change in the engine when the database reports one — as pure functions over a
 * record of what the two are believed to agree on.
 *
 * **This module exists because the bridge is a loop.** A mark drawn in the
 * reader becomes a row; that row syncs back into this same client; applying it
 * to the engine would make the engine report a change; writing that change would
 * make another row. Every step in that circle is something the feature genuinely
 * needs — the loop is what puts one window's highlight on another window's paper
 * — so the thing that has to be right is knowing when a change has already been
 * accounted for. That is what `AppliedAnnotations` is: a fingerprint per mark of
 * the state the engine and the database are believed to share. A change matching
 * the fingerprint is an echo and is dropped; anything else is real and is
 * applied, in whichever direction it came from.
 *
 * Two specific traps this closes, both of which write rows in a loop rather than
 * failing visibly:
 *
 * - **Uncommitted events.** EmbedPDF reports a change while it is still being
 *   made as well as when it is finished. Persisting the former means a row per
 *   animation frame while an ink stroke is dragged, through an optimistic
 *   client, a websocket and Postgres.
 * - **Import echo.** `importAnnotations` dispatches a create per item and then
 *   commits, so putting stored marks back on the paper makes the engine report
 *   every one of them as a committed creation. Without the fingerprint check,
 *   opening a paper rewrites every mark on it.
 *
 * Pure and engine-free on purpose: the committed-only rule and the echo check
 * are the two things in this task that fail silently and expensively, and they
 * are assertable here with a fake event and a plain map.
 */

/**
 * The part of a mark a fingerprint is taken of — everything a write carries,
 * which is the same in a row this client is about to send and in one sync just
 * delivered. Named structurally so the two are comparable without either type
 * knowing about the other.
 */
export type AnnotationContent = Pick<
  AnnotationRow,
  'pageIndex' | 'contents' | 'payload'
>

/** What the engine and the database are believed to agree on, for one mark. */
export interface AppliedAnnotation {
  /** Of the mark's content — see `fingerprint`. */
  fingerprint: string
  /** Kept because deleting from the engine is addressed by page and id. */
  pageIndex: number
  /**
   * True from the moment this client writes a mark until sync delivers it back.
   *
   * It exists to answer one question correctly: **is this mark's absence from
   * the rows evidence that it was deleted?** For a mark another window made, yes.
   * For one this client made a moment ago, no — the write and the query result
   * arrive on their own schedules, and a delivery that predates the row says
   * nothing about it. Without this, a reader's new highlight appeared, flickered
   * and vanished, taken off the paper by this client's own reconciliation
   * (user-reported).
   */
  pending?: boolean
}

export type AppliedAnnotations = ReadonlyMap<string, AppliedAnnotation>

/** A write this client should send to the database. */
export type DatabaseWrite =
  | { kind: 'create'; row: AnnotationRow; applied: AppliedAnnotation }
  | { kind: 'update'; row: AnnotationRow; applied: AppliedAnnotation }
  | { kind: 'delete'; id: string }

/**
 * What one delivery of rows means: what to change in the engine, and what the
 * two sides agree on afterwards.
 */
export interface RowsApplication {
  changes: EngineChange[]
  applied: Map<string, AppliedAnnotation>
}

/** A change this client should apply to the engine. */
export type EngineChange =
  | { kind: 'add'; annotation: SyncedAnnotation; applied: AppliedAnnotation }
  | {
      kind: 'replace'
      annotation: SyncedAnnotation
      applied: AppliedAnnotation
    }
  | { kind: 'remove'; id: string; pageIndex: number }

/**
 * A mark's content, as one comparable string.
 *
 * Deliberately covers exactly what a write carries — page, contents, payload —
 * and nothing else. The id is the key rather than part of the value, and the
 * timestamps are excluded because the server sets them: including `updatedAt`
 * would make every stored mark differ from its own echo the moment it came back
 * from sync, which is the loop this is here to break.
 *
 * **It has to be canonical, and that is not a nicety.** The two sides of every
 * comparison come from different places: one is the object EmbedPDF just
 * reported, the other is that same object after a trip through a `jsonb` column.
 * Postgres `jsonb` stores an object's keys sorted by length and then bytewise,
 * so what comes back is not written the way it was sent. A plain
 * `JSON.stringify` therefore reported *every* stored mark as different from
 * itself: a write never confirmed, every delivery read as a remote edit, and the
 * mark jittered between two spellings of the same thing — the rubber-banding a
 * reader sees while dragging (user-reported, twice).
 *
 * Keys are sorted; **array order is left alone**, because there it is data — an
 * ink stroke's points in another order is another stroke.
 */
export function fingerprint(row: AnnotationContent): string {
  return JSON.stringify(canonical([row.pageIndex, row.contents, row.payload]))
}

/** The same value with every object's keys in a fixed order. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical)
  }
  if (value === null || typeof value !== 'object') {
    return value
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => [key, canonical(nested)] as const)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
  )
}

/**
 * The database write an engine event calls for, or null if it calls for none.
 *
 * Null is the common answer, and each reason for it is a rule:
 *
 * - **`loaded` is not a change.** It reports how many annotations the document
 *   arrived carrying.
 * - **Uncommitted changes are not written.** See the module comment.
 * - **Annotations the PDF itself carries are not ours.** A published paper is
 *   full of link annotations, and the engine reports events about them like any
 *   other. `toRow` returns null for every type outside the decided twelve, and
 *   an update or deletion of a mark this bridge never stored is ignored for the
 *   same reason: adopting it would put a copy in the database that the file
 *   would go on drawing anyway, and the paper would open with the mark twice.
 * - **An echo is not a change.** A create whose fingerprint is already recorded
 *   is this client importing its own stored marks.
 */
export function writeForEvent(
  event: AnnotationEvent,
  articleId: string,
  applied: AppliedAnnotations,
): DatabaseWrite | null {
  if (event.type === 'loaded' || !event.committed) {
    return null
  }

  const known = applied.get(event.annotation.id)

  if (event.type === 'delete') {
    return known ? { kind: 'delete', id: event.annotation.id } : null
  }

  const row = toRow(event.annotation, articleId)
  if (!row) {
    return null
  }

  // `pending` until sync delivers this back: a write this client just sent is
  // not yet something the database is known to hold.
  const next = {
    fingerprint: fingerprint(row),
    pageIndex: row.pageIndex,
    pending: true,
  }

  if (!known) {
    // An update to something never stored is an edit of the file's own
    // furniture; only a creation starts a row.
    return event.type === 'create'
      ? { kind: 'create', row, applied: next }
      : null
  }

  return known.fingerprint === next.fingerprint
    ? null
    : { kind: 'update', row, applied: next }
}

/**
 * What the engine needs so the paper shows exactly the marks the database holds.
 *
 * Called with every row of the article's annotations each time sync delivers a
 * change, which covers three cases with one comparison: the marks a paper opens
 * with, a mark made in another window, and a mark another window edited or
 * deleted. Anything whose fingerprint already matches is left alone — the usual
 * case by far, since most of the rows in any delivery are ones this client wrote
 * itself.
 *
 * **Two rules govern removal**, and both are here rather than in the caller
 * because both were learned the hard way:
 *
 * - Removals are derived from what is recorded as applied, never from the
 *   engine's own contents — so a mark the PDF arrived with is never taken off,
 *   however this article's rows change.
 * - A mark this client has written but not yet seen come back is **not**
 *   removable, and no delivery may be applied to it at all. A delivery that
 *   predates the write says nothing about the mark — neither its absence, which
 *   would read as a deletion, nor its contents, which would read as a change and
 *   snap the mark back to where it was. See `AppliedAnnotation.pending`.
 *
 * It returns the next record along with the changes, rather than leaving the
 * caller to derive it: the two are one decision — what was applied, and what the
 * two sides now agree on — and splitting them is how the `pending` rule would
 * come apart.
 */
export function changesForRows(
  rows: readonly SyncedAnnotation[],
  applied: AppliedAnnotations,
): RowsApplication {
  const changes: EngineChange[] = []
  const next = new Map(applied)

  for (const row of rows) {
    const known = applied.get(row.id)
    const entry = { fingerprint: fingerprint(row), pageIndex: row.pageIndex }

    if (!known) {
      changes.push({ kind: 'add', annotation: row, applied: entry })
      next.set(row.id, entry)
      continue
    }

    if (known.pending) {
      /*
       * A write of this client's is still in flight, so this delivery is not
       * evidence about the mark: it may well predate the write, and applying it
       * would put the mark back where it was. That is the **rubber-banding** a
       * reader sees when dragging a mark quickly (user-reported) — two writes go
       * out, a delivery carrying the first arrives between them, and the mark
       * snaps back to a position the reader has already left. Worse, the engine
       * then reports that snap as a change of its own, and the stale position
       * can end up being the one that sticks.
       *
       * The row that matches what was written is the write coming back, and that
       * is what settles it. Anything else is ignored until then.
       */
      if (known.fingerprint === entry.fingerprint) {
        next.set(row.id, entry)
      }
      continue
    }

    if (known.fingerprint !== entry.fingerprint) {
      changes.push({ kind: 'replace', annotation: row, applied: entry })
    }
    next.set(row.id, entry)
  }

  const present = new Set(rows.map((row) => row.id))
  for (const [id, known] of applied) {
    if (!present.has(id) && !known.pending) {
      changes.push({ kind: 'remove', id, pageIndex: known.pageIndex })
      next.delete(id)
    }
  }

  return { changes, applied: next }
}
