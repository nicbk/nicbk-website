import type { GlyphPointer, SelectionRangeX } from '@embedpdf/plugin-selection'

/**
 * What a dragged handle does to the selection.
 *
 * The whole of the gesture's arithmetic, kept away from the DOM so it can be
 * tested at its edges — the DOM part is a pointer moving, which jsdom cannot
 * meaningfully produce.
 *
 * **The anchor is the other end, and it does not move.** Dragging is not
 * "editing the start" or "editing the end"; it is holding one boundary still and
 * putting the other wherever the finger is. Which of the two the finger holds
 * can change mid-drag — pull the start past the end and the reader is now
 * dragging the end — and reporting that back is what keeps the next move going
 * the way the finger does.
 */

/** Which boundary of a selection is meant. */
export type SelectionEnd = 'start' | 'end'

export interface DragToJudge {
  /** The end the finger currently holds. */
  dragging: SelectionEnd
  /** The selection as it stands. */
  range: SelectionRangeX
  /** The glyph now under the finger. */
  to: GlyphPointer
}

export interface ExtendedSelection {
  /** The new selection, always ordered start-before-end. */
  range: SelectionRangeX
  /** The end the finger holds now, which may not be the one it held before. */
  dragging: SelectionEnd
}

/**
 * Moves the held boundary to `to`, keeping the other where it is.
 *
 * Character-precise on purpose: the boundary lands on the glyph under the
 * finger, as it does on a phone, and the magnifier is what makes aiming at a
 * glyph possible when a thumb covers three of them.
 */
export function extendSelection({
  dragging,
  range,
  to,
}: DragToJudge): ExtendedSelection {
  const anchor = dragging === 'start' ? range.end : range.start

  if (isBefore(to, anchor)) {
    return { range: { start: to, end: anchor }, dragging: 'start' }
  }

  return { range: { start: anchor, end: to }, dragging: 'end' }
}

/**
 * Reading order: earlier page first, then earlier glyph.
 *
 * The page comparison is not decoration even while a handle stops at its own
 * page's edge — the *anchor* can be on another page as soon as a range spans
 * one, and an ordering that compared indices alone would silently invert such a
 * selection and mark the wrong half of the paper.
 */
function isBefore(one: GlyphPointer, other: GlyphPointer): boolean {
  if (one.page !== other.page) {
    return one.page < other.page
  }
  return one.index < other.index
}
