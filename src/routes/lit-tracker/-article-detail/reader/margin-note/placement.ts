import type { Rect, Size } from '@embedpdf/models'
import { MARGIN_BOX_HEIGHT, MARGIN_BOX_WIDTH } from '../margin-text-box'
import type { MarginSide, TextBlock } from './margin'
import { marginWidth, nearerMargin } from './margin'

/**
 * Where a margin note goes, or why it cannot go anywhere
 * (features/a-passage-gets-a-margin-note).
 *
 * Pure: page geometry, the passage and the rectangles already on the page in;
 * a rectangle or a reason out. Nothing is created until this has said yes, so a
 * refusal leaves the paper exactly as it was — no highlight without its note.
 *
 * **The nearer margin or nothing** (user-decided 2026-10-12). A note that would
 * overlap something there is refused rather than overlapping, and is never
 * moved to the far margin, where it would no longer read as belonging to the
 * passage.
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

export type Placement =
  | { placed: true; rect: Rect; side: MarginSide }
  | { placed: false; reason: Refusal }

export interface PlacementInput {
  /** The page, in page points. */
  page: Size
  /** The page's text block (`margin.ts`). */
  block: TextBlock
  /** The passage on this page — the selection's rectangle. */
  passage: Rect
  /** Every annotation already on the page. Any overlap refuses. */
  obstacles: readonly Rect[]
}

export function placeMarginNote({
  page,
  block,
  passage,
  obstacles,
}: PlacementInput): Placement {
  const side = nearerMargin(block, passage)
  const usable = marginWidth(block, page, side) - 2 * MARGIN_INSET
  if (usable < NARROWEST_NOTE) {
    return { placed: false, reason: 'too-narrow' }
  }

  // As wide as #24 decided, or as the margin allows if that is less: an ACM
  // paper's 54pt margin takes a 46pt note.
  const width = Math.min(MARGIN_BOX_WIDTH, usable)
  const height = MARGIN_BOX_HEIGHT
  // Against the text rather than the page's edge, so the note sits by the
  // passage it is about.
  const x =
    side === 'left'
      ? block.left - MARGIN_INSET - width
      : block.right + MARGIN_INSET
  // Level with the passage's first line — unless that would run the note off
  // the foot of the page, in which case it ends where the page does.
  const y = Math.max(
    MARGIN_INSET,
    Math.min(passage.origin.y, page.height - MARGIN_INSET - height),
  )

  const rect: Rect = { origin: { x, y }, size: { width, height } }
  if (obstacles.some((obstacle) => overlaps(rect, obstacle))) {
    return { placed: false, reason: 'no-room' }
  }
  return { placed: true, rect, side }
}

/** Whether two rectangles share any area. Touching edges do not count. */
export function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.origin.x < b.origin.x + b.size.width &&
    b.origin.x < a.origin.x + a.size.width &&
    a.origin.y < b.origin.y + b.size.height &&
    b.origin.y < a.origin.y + a.size.height
  )
}
