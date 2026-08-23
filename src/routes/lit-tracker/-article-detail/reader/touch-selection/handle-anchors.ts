import type { PdfPageGeometry } from '@embedpdf/models'
import type { SelectionRangeX } from '@embedpdf/plugin-selection'
import { rectsWithinSlice } from '@embedpdf/plugin-selection'

/**
 * Where a selection's handles belong, in page coordinates.
 *
 * **A boundary, not a character.** A handle marks the edge *between* two glyphs:
 * the start handle sits at the left edge of the first selected glyph and the end
 * handle at the right edge of the last. That is what lets the decided shape —
 * iOS's, a bar at the boundary with its dot outside the line — sit over the
 * selection without hiding the words it bounds.
 *
 * **Measured from the boundary glyph itself, not from the selection's
 * rectangles.** The plugin publishes merged rects per page, and the first of
 * them is *usually* the one the selection starts in — but the merge exists to
 * join runs that read as one line, and its order is its own business. Asking for
 * the single glyph at each end, through the library's own
 * `rectsWithinSlice`, is exact: it is the same function that draws the
 * highlight, given a slice of one.
 */

export interface HandleAnchor {
  /** The boundary's position across the line, in page coordinates. */
  x: number
  /** Top of the line the boundary belongs to. */
  top: number
  /** Bottom of that line. */
  bottom: number
}

export interface SelectionHandleAnchors {
  /** Null when the selection starts on another page, or on no glyph this page has. */
  start: HandleAnchor | null
  /** Null for the same reasons, at the other end. */
  end: HandleAnchor | null
}

/**
 * The two anchors for `range` as they fall on `pageIndex`.
 *
 * Each end is answered independently, so a selection that begins on this page
 * and ends on the next produces a start anchor here and an end anchor there.
 * Nothing in this task makes such a range — a handle stops at its page's edge
 * until `selection-across-pages` lands — but answering per end is what makes
 * that task an extension rather than a rewrite.
 */
export function handleAnchors(
  geometry: PdfPageGeometry,
  range: SelectionRangeX,
  pageIndex: number,
): SelectionHandleAnchors {
  return {
    start:
      range.start.page === pageIndex
        ? anchorAt(geometry, range.start.index, 'left')
        : null,
    end:
      range.end.page === pageIndex
        ? anchorAt(geometry, range.end.index, 'right')
        : null,
  }
}

/**
 * The edge of one glyph.
 *
 * Returns null when the glyph has no rectangle to speak of — a line break, a
 * character the engine records with no box, or an index the page no longer has
 * because its geometry was evicted and reloaded. A handle that cannot be placed
 * is simply not drawn, which is a better answer than one drawn at the origin.
 */
function anchorAt(
  geometry: PdfPageGeometry,
  index: number,
  edge: 'left' | 'right',
): HandleAnchor | null {
  // Unmerged: a slice of one glyph has nothing to merge with, and asking for
  // the merge would only invite it to be joined to a neighbour.
  const [rect] = rectsWithinSlice(geometry, index, index, false)
  if (!rect) {
    return null
  }

  return {
    x: edge === 'left' ? rect.origin.x : rect.origin.x + rect.size.width,
    top: rect.origin.y,
    bottom: rect.origin.y + rect.size.height,
  }
}
