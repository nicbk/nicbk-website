import type { Rect, Size } from '@embedpdf/models'
import { MARGIN_BOX_HEIGHT, MARGIN_BOX_WIDTH } from '../margin-text-box'
import type { MarginSide, TextBlock } from './margin'
import { marginWidth, nearerMargin } from './margin'
import type { MovableNote } from './packing'
import { packNotes } from './packing'

/**
 * Where a margin note goes, or why it cannot go anywhere
 * (features/a-passage-gets-a-margin-note).
 *
 * Pure: page geometry, the passage and what is already on the page in; a
 * rectangle — with any moves other margin notes must make for it — or a reason
 * out. Nothing is created until this has said yes, so a refusal leaves the
 * paper exactly as it was — no highlight without its note, no note moved for a
 * note that never came.
 *
 * **The nearer margin or nothing** (user-decided 2026-10-12). A note that would
 * overlap something there is refused rather than overlapping, and is never
 * moved to the far margin, where it would no longer read as belonging to the
 * passage. Other margin notes may make room for it (`packing.ts`); nothing
 * else ever moves.
 */

/**
 * Air between the note and the page's edge, and between the note and the text.
 * Without it a note in a narrow margin touches the paper's words.
 */
export const MARGIN_INSET = 4

/**
 * The narrowest note worth writing: about nine characters a line at #24's 8pt.
 * Below it a sentence becomes a column of syllables, and the reader is better
 * told the margin is too narrow than handed one.
 */
export const NARROWEST_NOTE = 36

export type Refusal = 'too-narrow' | 'no-room'

/** A margin note already on the page, as placement needs to know it. */
export interface PlacedNote {
  id: string
  rect: Rect
  /** The top of the passage it answers (its highlight's top). */
  anchor: number
}

/** Where other margin notes move to make room, by id: their new tops. */
export type Moves = Map<string, number>

export type Placement =
  | { placed: true; rect: Rect; side: MarginSide; moves: Moves }
  | { placed: false; reason: Refusal }

export interface PlacementInput {
  /** The page, in page points. */
  page: Size
  /** The page's text block (`margin.ts`). */
  block: TextBlock
  /** The passage on this page — the selection's rectangle. */
  passage: Rect
  /** Every annotation on the page that is not a margin note. Never moved. */
  obstacles: readonly Rect[]
  /** The margin notes already on the page. These may move to make room. */
  notes: readonly PlacedNote[]
}

/** The id the note being made goes by while it is packed. */
const NEW_NOTE = '\u0000new'

export function placeMarginNote({
  page,
  block,
  passage,
  obstacles,
  notes,
}: PlacementInput): Placement {
  const side = nearerMargin(block, passage)
  const usable = marginWidth(block, page, side) - 2 * MARGIN_INSET
  if (usable < NARROWEST_NOTE) {
    return { placed: false, reason: 'too-narrow' }
  }

  // As wide as #24 decided, or as the margin allows if that is less: an ACM
  // paper's 54pt margin takes a 46pt note.
  const width = Math.min(MARGIN_BOX_WIDTH, usable)
  // Against the text rather than the page's edge, so the note sits by the
  // passage it is about.
  const x =
    side === 'left'
      ? block.left - MARGIN_INSET - width
      : block.right + MARGIN_INSET

  const packing = packColumn({
    column: { left: x, right: x + width },
    page,
    obstacles,
    notes,
    // Level with the passage's first line, if the margin allows.
    adding: {
      id: NEW_NOTE,
      height: MARGIN_BOX_HEIGHT,
      anchor: passage.origin.y,
    },
  })
  const top = packing?.get(NEW_NOTE)
  if (!packing || top === undefined) {
    return { placed: false, reason: 'no-room' }
  }
  packing.delete(NEW_NOTE)

  return {
    placed: true,
    side,
    rect: { origin: { x, y: top }, size: { width, height: MARGIN_BOX_HEIGHT } },
    moves: packing,
  }
}

export interface ColumnInput {
  /** The column's horizontal extent, in page points. */
  column: { left: number; right: number }
  page: Size
  /** Every annotation on the page that is not a margin note. */
  obstacles: readonly Rect[]
  /** The margin notes on the page; only those in the column take part. */
  notes: readonly PlacedNote[]
  /** A note joining the column, if any: the one being made. */
  adding?: { id: string; height: number; anchor: number }
  /** A note in the column whose height has changed, if any. */
  resized?: { id: string; height: number }
}

/**
 * Packs the margin notes of one column (`packing.ts`), returning a top for
 * every note that has to move — and for the note being added — or null when
 * there is no arrangement that keeps every note within reach of its passage.
 *
 * A note that need not move is left out of the answer, so applying it changes
 * exactly what has to change.
 */
export function packColumn({
  column,
  page,
  obstacles,
  notes,
  adding,
  resized,
}: ColumnInput): Moves | null {
  const inColumn = (rect: Rect) =>
    rect.origin.x < column.right &&
    column.left < rect.origin.x + rect.size.width

  const movable: MovableNote[] = notes
    .filter((note) => inColumn(note.rect))
    .map((note) => ({
      id: note.id,
      height: note.id === resized?.id ? resized.height : note.rect.size.height,
      anchor: note.anchor,
      current: note.rect.origin.y,
    }))
  if (adding) {
    movable.push({ ...adding, current: null })
  }

  const packing = packNotes({
    notes: movable,
    obstacles: obstacles.filter(inColumn).map((rect) => ({
      top: rect.origin.y,
      height: rect.size.height,
    })),
    bounds: { top: MARGIN_INSET, bottom: page.height - MARGIN_INSET },
  })
  if (!packing) {
    return null
  }

  const moves: Moves = new Map()
  for (const note of movable) {
    const top = packing.get(note.id)
    if (top !== undefined && top !== note.current) {
      moves.set(note.id, top)
    }
  }
  return moves
}
