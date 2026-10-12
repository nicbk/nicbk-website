import type { PageVisibilityMetrics } from '@embedpdf/plugin-scroll'
import type { ReadingLine } from '../reader-jump'

/**
 * Where on a page the reader is reading, for the contents list's mark
 * (features/a-paper-shows-its-contents).
 *
 * **The line is where a jump lands**, just below the toolbar (`go-to.ts`), not
 * the panel's top third the spec first proposed. Measured against the third, a
 * reader who chose *2 Method* was shown *2.1 Setup* marked whenever 2.1 began
 * within a third of a screen of it — choosing one entry and being told you are
 * in another. At the landing line, the entry chosen is the entry marked.
 *
 * **At the end of the paper the line drops to the panel's bottom.** The last
 * screenful can never be scrolled to the top, so a heading in it would never
 * reach the landing line and choosing it would mark the section before. Once
 * there is nowhere further to scroll, the last heading on screen is the
 * section in view.
 */

/**
 * The point at `linePx` screen pixels below the reader's top, as a page and a
 * top in page points.
 *
 * **Corrected for the viewport's padding**, as `positionFromMetrics` is and for
 * its measured reason: the scroller's metrics count from `viewportGap` pixels
 * below the reader's top. A line that falls in the gap between two pages is
 * placed at the bottom of the page above it, so a section starting at the top
 * of the next page is not yet in view.
 */
export function lineFromMetrics(
  metrics: readonly PageVisibilityMetrics[],
  linePx: number,
  viewportGap: number,
): ReadingLine | null {
  const at = linePx - viewportGap
  const pages = [...metrics]
    .filter((page) => page.scaled.scale > 0)
    .sort((a, b) => a.viewportY - b.viewportY)
  const first = pages[0]
  if (first === undefined) {
    return null
  }

  // The last page whose visible part starts at or above the line; the first
  // page when the line is above all of them.
  let page = first
  for (const candidate of pages) {
    if (candidate.viewportY <= at) {
      page = candidate
    }
  }
  const scale = page.scaled.scale
  const top = page.original.pageY + (at - page.viewportY) / scale
  const bottom = page.original.pageY + page.original.visibleHeight
  return {
    pageIndex: page.pageNumber - 1,
    top: Math.min(Math.max(0, top), bottom),
  }
}

/** The paper's last page: its 1-based number and its height in points. */
export interface LastPage {
  pageNumber: number
  height: number
}

/**
 * How far below the reader's top the line is: the jump's landing, or the
 * panel's bottom once **the end of the paper is on screen** — the last page's
 * bottom visible. From there nothing further down can be brought up to the
 * landing line, however far the reader scrolls.
 *
 * Read from the scroller's metrics rather than the scroll container's
 * `scrollHeight`, which the viewport plugin records only when the container is
 * resized: measured in the browser, it still read the empty container's 796px
 * with 120 pages laid out, which put every position "at the end".
 */
export function linePosition(
  metrics: readonly PageVisibilityMetrics[],
  lastPage: LastPage | null,
  clientHeight: number,
  landingPx: number,
): number {
  const last = metrics.find((page) => page.pageNumber === lastPage?.pageNumber)
  const endInView =
    lastPage !== null &&
    last !== undefined &&
    last.original.pageY + last.original.visibleHeight >= lastPage.height - 1
  return endInView ? clientHeight : landingPx
}

/** The last page of a loaded document, or `null` before there is one. */
export function lastPageOf(
  document: { pages: readonly { size: { height: number } }[] } | null,
): LastPage | null {
  const pages = document?.pages ?? []
  const last = pages.at(-1)
  return last === undefined
    ? null
    : { pageNumber: pages.length, height: last.size.height }
}
