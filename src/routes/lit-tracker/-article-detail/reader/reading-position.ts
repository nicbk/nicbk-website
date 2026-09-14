import type { PageVisibilityMetrics } from '@embedpdf/plugin-scroll'

/**
 * Where in a paper the reader is, as stored on the article
 * (features/a-paper-opens-where-you-left-it).
 *
 * `page` is 1-based, as the scroller counts; `offset` is how far down that page
 * the top of the reader is, in page points. Points rather than pixels, so the
 * same paragraph comes back at any zoom and on any screen.
 */
export interface ReadingPosition {
  page: number
  offset: number
}

/**
 * Movement smaller than this is not saved: about one line of a paper's body
 * text. A reader who nudges the page has not moved on, and a write per nudge is
 * a write nobody would miss.
 */
export const LINE_HEIGHT_PT = 12

/**
 * The position at the top of the reader, from the scroller's visibility
 * metrics.
 *
 * **Corrected for the viewport's padding.** EmbedPDF pads its scroll container
 * by `viewportGap` pixels and scrolls with that padding counted, but measures
 * a page's visible offset without it — so `original.pageY` reads `viewportGap /
 * scale` points further down the page than the reader is. Measured in the
 * browser at 152%: asked for 400pt, the page sat at 399.86pt in the DOM and the
 * metrics said 406.45. Stored uncorrected, every open would creep ~7pt, and a
 * paper opened at another width would land a different distance off.
 *
 * The top page is the one nearest the top of the reader, not the one EmbedPDF
 * calls current (the most visible): the paragraph at the top is what a reader
 * expects back. Where the top falls in the gap between two pages, the offset
 * is clamped to the next page's top.
 */
export function positionFromMetrics(
  metrics: readonly PageVisibilityMetrics[],
  viewportGap: number,
): ReadingPosition | null {
  let top: PageVisibilityMetrics | undefined
  for (const page of metrics) {
    if (top === undefined || page.viewportY < top.viewportY) {
      top = page
    }
  }
  if (top === undefined || !(top.scaled.scale > 0)) {
    return null
  }
  return {
    page: top.pageNumber,
    offset: Math.max(0, top.original.pageY - viewportGap / top.scaled.scale),
  }
}

/**
 * A saved position this paper can be opened at, or `null` to open at the top.
 *
 * A page past the end is ignored rather than clamped to the last page: it means
 * the stored position belongs to a different file than the one being read, and
 * the last page of that is no better a guess than the first.
 */
export function restorablePosition(
  saved: ReadingPosition | null,
  totalPages: number,
): ReadingPosition | null {
  if (
    saved === null ||
    !Number.isInteger(saved.page) ||
    saved.page < 1 ||
    saved.page > totalPages ||
    !Number.isFinite(saved.offset) ||
    saved.offset < 0
  ) {
    return null
  }
  return saved
}

/** Whether the reader has moved far enough from `from` to be worth saving. */
export function hasMoved(
  to: ReadingPosition,
  from: ReadingPosition | null,
): boolean {
  return (
    from === null ||
    to.page !== from.page ||
    Math.abs(to.offset - from.offset) > LINE_HEIGHT_PT
  )
}
