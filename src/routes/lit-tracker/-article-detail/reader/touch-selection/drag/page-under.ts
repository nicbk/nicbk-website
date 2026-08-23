import type { Position } from '@embedpdf/models'
import type { PageVisibilityMetrics } from '@embedpdf/plugin-scroll'

/**
 * Which page a point in the reader's panel falls on, and where on it.
 *
 * **Asked of the library, not of the DOM.** `elementFromPoint` would answer this
 * until something was drawn over the paper — and during a handle drag something
 * always is: the handle itself, and the magnifier the finger summons. The scroll
 * plugin already publishes what is needed as numbers, so this is arithmetic and
 * can be tested without a browser.
 *
 * **What the library gives, precisely.** Each entry of `pageVisibilityMetrics`
 * describes the *intersection* of one page with the panel: `viewportX/viewportY`
 * is that intersection's top-left in panel coordinates, and `scaled.pageX/pageY`
 * is the same corner's offset inside the page. Subtracting one from the other
 * gives the page's own origin, which is what a point has to be measured from.
 * `scaled.scale` is the zoom those numbers were measured at — read from the
 * metric rather than from the document's state, so a point can never be mapped
 * with a scale the geometry was not measured at.
 *
 * **`pageNumber` counts from 1**, alone among the page numbers in this reader
 * (`page.index + 1`, in the plugin's own layout code). Everything here counts
 * from 0, as the rest of the reader does, and the conversion happens once — in
 * this file.
 */

/** A point on a page, in that page's own coordinates. */
export interface PageHit {
  /** 0-based, as everything in this reader is. */
  pageIndex: number
  /** Where the point falls on that page, in page units. */
  point: Position
}

/**
 * The page under `inPanel`, a point in the panel's coordinates.
 *
 * **Vertical containment, then the nearest page.** This reader scrolls
 * vertically, so a page occupies a band of the panel and the point's `y` decides
 * which one it is in. A finger in the margin beside a page is on that page —
 * `glyphAt` will find no glyph there and the boundary will stay where it is,
 * which is the behaviour a margin should have. A finger in the *gap* between two
 * pages is on the nearer of them, which is what keeps the magnifier showing
 * paper while a drag crosses a break.
 *
 * Null only when no page is visible at all, which means there is nothing on
 * screen to select.
 */
export function pageUnder(
  pages: PageVisibilityMetrics[],
  inPanel: Position,
): PageHit | null {
  let nearest: PageVisibilityMetrics | null = null
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const page of pages) {
    const distance = verticalDistance(page, inPanel.y)
    if (distance < nearestDistance) {
      nearest = page
      nearestDistance = distance
    }
  }

  if (!nearest) {
    return null
  }

  return {
    pageIndex: nearest.pageNumber - 1,
    point: onPage(nearest, inPanel),
  }
}

/** How far `y` is from the band this page occupies; 0 while inside it. */
function verticalDistance(page: PageVisibilityMetrics, y: number): number {
  const top = page.viewportY
  const bottom = top + page.scaled.visibleHeight

  if (y < top) {
    return top - y
  }
  if (y > bottom) {
    return y - bottom
  }
  return 0
}

/**
 * A panel point in one page's coordinates.
 *
 * Not clamped to the page: a point above, below or beside it maps to a
 * coordinate outside the page, which is the truth, and every caller already
 * treats "no glyph there" as "leave the boundary alone".
 */
function onPage(page: PageVisibilityMetrics, inPanel: Position): Position {
  const scale = page.scaled.scale
  const originX = page.viewportX - page.scaled.pageX
  const originY = page.viewportY - page.scaled.pageY

  return {
    x: (inPanel.x - originX) / scale,
    y: (inPanel.y - originY) / scale,
  }
}
