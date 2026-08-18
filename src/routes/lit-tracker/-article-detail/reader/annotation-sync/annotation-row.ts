import type { PdfAnnotationObject } from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import type {
  AnnotationPayload,
  AnnotationType,
} from '~/lit-tracker/annotation-type'

/**
 * The two-way translation between an EmbedPDF annotation object and a row of the
 * `annotations` table.
 *
 * Pure functions in a module of their own, because this is the part of the
 * bridge that can be wrong *quietly*: a dropped field does not throw, it just
 * means an ink stroke comes back without its points, or a highlight without the
 * rectangles that place it. The round-trip test over all twelve types is the
 * only thing standing between that and a paper that reloads slightly wrong.
 *
 * The shape of the translation is decided in
 * research/data-modeling/annotations-schema.md and amounts to three rules:
 *
 * - **`type`, `pageIndex` and `contents` are promoted to columns**, because
 *   something other than the reader reads them — task 5's list shows a kind and
 *   a snippet, and its jump-to-page reads the page.
 * - **Everything else type-specific stays in `payload`**, mirroring EmbedPDF's
 *   own object shape so this layer stays thin enough to check.
 * - **The library's `author`, `created` and `modified` are not stored.** The row
 *   has an owner and its own timestamps; these are filled back in on the way
 *   out. Dropping them is also what keeps `payload` JSON — `created` is a `Date`,
 *   which neither `jsonb` nor Zero can carry.
 */

/** A row as this reader writes it. The timestamps and owner are the server's. */
export interface AnnotationRow {
  id: string
  articleId: string
  type: AnnotationType
  pageIndex: number
  contents: string | null
  payload: AnnotationPayload
}

/** A row as it comes back from sync. */
export interface SyncedAnnotation {
  id: string
  type: AnnotationType
  pageIndex: number
  contents: string | null
  payload: AnnotationPayload
  /**
   * Epoch milliseconds, per this project's Zero timestamp convention.
   *
   * Nullable only because the column carries a database default, which the
   * generated schema reports as "the client need not supply it". Every mutator
   * here sets both explicitly, so in practice these are always present — the
   * null case is honoured rather than asserted away, and simply means the object
   * handed to the engine carries no date.
   */
  createdAt: number | null
  updatedAt: number | null
}

/**
 * The twelve kinds of mark this reader stores, by the number EmbedPDF calls
 * them.
 *
 * Written in this direction only, with the inverse derived below, so the two can
 * never disagree — a hand-maintained pair of maps is one edit away from a type
 * that saves as one thing and loads as another.
 *
 * The subtypes *missing* from this map are the ones a PDF arrives carrying:
 * `LINK` (every citation in a modern paper), `POPUP`, `WIDGET`, and the rest.
 * They are why the translation returns null rather than throwing — the engine
 * loads them from the file and reports events about them, and none of that is
 * this table's business. `STAMP` is absent for a different reason: it is
 * excluded by decision, being the one type whose payload is a binary image.
 */
const TYPE_BY_SUBTYPE = {
  [PdfAnnotationSubtype.HIGHLIGHT]: 'highlight',
  [PdfAnnotationSubtype.UNDERLINE]: 'underline',
  [PdfAnnotationSubtype.STRIKEOUT]: 'strikeout',
  [PdfAnnotationSubtype.SQUIGGLY]: 'squiggly',
  [PdfAnnotationSubtype.INK]: 'ink',
  [PdfAnnotationSubtype.SQUARE]: 'square',
  [PdfAnnotationSubtype.CIRCLE]: 'circle',
  [PdfAnnotationSubtype.LINE]: 'line',
  [PdfAnnotationSubtype.POLYLINE]: 'polyline',
  [PdfAnnotationSubtype.POLYGON]: 'polygon',
  [PdfAnnotationSubtype.FREETEXT]: 'freeText',
  [PdfAnnotationSubtype.TEXT]: 'text',
} as const satisfies Partial<Record<PdfAnnotationSubtype, AnnotationType>>

type StorableSubtype = keyof typeof TYPE_BY_SUBTYPE

const SUBTYPE_BY_TYPE = Object.fromEntries(
  Object.entries(TYPE_BY_SUBTYPE).map(([subtype, type]) => [
    type,
    Number(subtype),
  ]),
) as Record<AnnotationType, StorableSubtype>

/**
 * What is *not* copied into `payload`.
 *
 * The first four are columns of their own, and a second copy in the JSON would
 * be free to disagree with them. `author`, `created` and `modified` are the
 * fields the schema doc decided against storing. `appearanceModes` is the odd
 * one out and the reason this list is worth reading: it is a bitmask describing
 * the appearance stream the annotation was read out of a PDF *with* — a fact
 * about a particular binary, not about the mark — and this reader never rewrites
 * the binary. Carrying it forward would claim an appearance stream that the
 * freshly-fetched PDF does not contain.
 */
const NOT_IN_PAYLOAD = [
  'id',
  'type',
  'pageIndex',
  'contents',
  'author',
  'created',
  'modified',
  'appearanceModes',
] as const

/**
 * An engine object as a row, or **null if this is not a mark we store**.
 *
 * Null is the expected answer for a large fraction of the annotations in a real
 * paper — a published PDF is full of link annotations — so callers treat it as
 * "not ours" rather than as a failure.
 */
export function toRow(
  annotation: PdfAnnotationObject,
  articleId: string,
): AnnotationRow | null {
  const type = TYPE_BY_SUBTYPE[annotation.type as StorableSubtype] as
    | AnnotationType
    | undefined
  if (type === undefined) {
    return null
  }

  return {
    id: annotation.id,
    articleId,
    type,
    pageIndex: annotation.pageIndex,
    contents: annotation.contents ?? null,
    payload: toPayload(annotation),
  }
}

/**
 * A row as an object EmbedPDF's `importAnnotations` accepts.
 *
 * `author` and the timestamps are populated here rather than read from storage,
 * which is the whole reason they are not columns: the row's own `created_at` and
 * `updated_at` are the truth about when the mark was made, and its `user_id` is
 * the only author it could possibly have.
 */
export function toAnnotation(
  row: SyncedAnnotation,
  author: string | undefined,
): PdfAnnotationObject {
  return {
    ...row.payload,
    id: row.id,
    type: SUBTYPE_BY_TYPE[row.type],
    pageIndex: row.pageIndex,
    contents: row.contents ?? undefined,
    created: asDate(row.createdAt),
    modified: asDate(row.updatedAt),
    author,
    // The payload's own fields are unknown-typed by construction — the shape
    // belongs to EmbedPDF and differs per type — so this is the one place the
    // reconstructed object is asserted to be one. Everything the engine needs to
    // redraw the mark came out of a payload this module wrote, and the
    // round-trip tests are what hold that true.
  } as PdfAnnotationObject
}

/**
 * The passage a mark was drawn over, if the engine captured one.
 *
 * **It is in `payload`, not in `contents`, and that is EmbedPDF's doing rather
 * than a choice made here.** The plugin's text-markup handler puts the selected
 * text in the annotation's `custom` data at creation, and `toPayload` carries
 * `custom` through like any other field it does not exclude — so every highlight
 * this reader has ever made already holds its quote. Task 5's list showed a type
 * name for them because it read `contents`, which the engine leaves empty; the
 * finding is written up in that task's status.
 *
 * `contents` is left to mean **the reader's own words**, which is what it
 * already means for a text box and a sticky note. Keeping the two apart is what
 * lets a comment on a highlight coexist with the sentence it comments on.
 *
 * Read defensively because `payload` is typed as JSON and no more: its shape
 * belongs to EmbedPDF, and a mark made by any other tool simply has no `custom`.
 * Blank is treated as absent — a quote of nothing is not a quote.
 */
export function quotedText(
  row: Pick<SyncedAnnotation, 'payload'>,
): string | null {
  // Bracketed because `payload` is an index signature by design — its keys are
  // EmbedPDF's, not this project's, so none of them is a declared property.
  const custom = row.payload['custom']
  if (typeof custom !== 'object' || custom === null || Array.isArray(custom)) {
    return null
  }
  const text = custom['text']
  return typeof text === 'string' && text.trim() !== '' ? text : null
}

/**
 * A mark's `intent`, the PDF field that distinguishes two marks of one subtype.
 *
 * The engine uses it for exactly this — its own `inkHighlighter` is an ink
 * annotation whose intent is `InkHighlight` — and this reader's highlight box is
 * a square whose intent says so (see `highlight-box-tool.ts`). Without it, a
 * translucent box and an opaque rectangle are the same stored type and the
 * sidebar would have to call them the same thing.
 */
export function annotationIntent(
  row: Pick<SyncedAnnotation, 'payload'>,
): string | null {
  const intent = row.payload['intent']
  return typeof intent === 'string' ? intent : null
}

/** Epoch milliseconds as EmbedPDF's optional `Date`, absent staying absent. */
function asDate(epochMs: number | null): Date | undefined {
  return epochMs === null ? undefined : new Date(epochMs)
}

/** Everything type-specific, which is everything not listed in `NOT_IN_PAYLOAD`. */
function toPayload(annotation: PdfAnnotationObject): AnnotationPayload {
  const payload: AnnotationPayload = {}
  const excluded = new Set<string>(NOT_IN_PAYLOAD)

  for (const [key, value] of Object.entries(annotation)) {
    if (!excluded.has(key) && value !== undefined) {
      payload[key] = value
    }
  }
  return payload
}
