import type { PdfPageGeometry, Position } from '@embedpdf/models'
import type { SelectionRangeX } from '@embedpdf/plugin-selection'
import { expandToWordBoundary, glyphAt } from '@embedpdf/plugin-selection'

/**
 * The word under a point on a page, as a selection range.
 *
 * **This is the library's own double-click, driven from a hold.** EmbedPDF
 * selects a word on double-click by doing exactly this — `glyphAt` to find the
 * glyph under the point, `expandToWordBoundary` to grow it to the word, then a
 * range of `{start, end}` with *inclusive* indices — but it does it from a
 * private method reachable only through that gesture. Both helpers are exported,
 * so a long press can produce precisely what a double-click produces rather than
 * an approximation of it, and the reader gets one selection model instead of
 * two.
 *
 * Pure, and testable over a geometry fixture: everything that decides the answer
 * is in the arguments.
 */

/**
 * The word around `point`, or null if there is no text there.
 *
 * Null is an ordinary answer, not a failure: a hold lands on a figure, in a
 * margin, or on a page that is all scanned image, and in each case the right
 * response is to select nothing rather than to reach for the nearest word on
 * the page.
 *
 * `glyphAt` is called at the library's default tolerance, which is what the
 * reader's own pointer selection already uses — the plugin is registered without
 * a `toleranceFactor` (`reader-plugins.ts`), so a hold and a click hit-test the
 * same way. That tolerance is why a press *between* two words still finds one:
 * it falls back to the closest glyph within about one-and-a-half line heights.
 */
export function wordAt(
  geometry: PdfPageGeometry,
  point: Position,
  pageIndex: number,
): SelectionRangeX | null {
  const glyph = glyphAt(geometry, point)
  if (glyph === -1) {
    return null
  }

  const word = expandToWordBoundary(geometry, glyph)
  if (!word) {
    return null
  }

  return {
    start: { page: pageIndex, index: word.from },
    end: { page: pageIndex, index: word.to },
  }
}
