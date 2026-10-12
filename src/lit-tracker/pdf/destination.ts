import type { PdfDestinationObject, PdfLinkTarget } from '@embedpdf/models'
import { PdfActionType, PdfZoomMode } from '@embedpdf/models'

/**
 * Where a PDF's own internal pointer goes — a link's target, an outline entry's
 * — as a page and a point on it.
 *
 * Shared by two readers of the same structure: the reader's link preview
 * (`routes/…/reader/link-preview-*.ts`, features/a-link-is-a-link) and the
 * contents extraction on the server (`lit-tracker/contents/`,
 * features/a-paper-shows-its-contents). Both receive the engine's
 * `PdfLinkTarget`, and both need the same answer from it; one module keeps the
 * two from disagreeing about what a destination means.
 */

/**
 * The destination a target points at: a destination itself, or the one a
 * go-to action carries. A URL, or no target, has none.
 */
export function destinationOf(
  target: PdfLinkTarget | undefined,
): PdfDestinationObject | null {
  if (target?.type === 'destination') {
    return target.destination
  }
  if (target?.type === 'action' && target.action.type === PdfActionType.Goto) {
    return target.action.destination
  }
  return null
}

/** A point on a page, top-left origin. */
export interface Point {
  x: number
  y: number
}

/**
 * The destination's own point, converted to top-left page coordinates.
 *
 * XYZ carries `(x, y)`; FitRectangle carries its box in `view` as
 * `[left, bottom, right, top]`. Any other form — FitPage, FitHorizontal with no
 * parameters — gives only a page, so the point is its top.
 */
export function targetTop(
  destination: PdfDestinationObject,
  page: { height: number },
): Point {
  const { zoom, view } = destination
  if (zoom.mode === PdfZoomMode.XYZ) {
    return { x: zoom.params.x, y: page.height - zoom.params.y }
  }
  if (zoom.mode === PdfZoomMode.FitRectangle && view.length === 4) {
    const [left = 0, , , top = page.height] = view
    return { x: left, y: page.height - top }
  }
  return { x: 0, y: 0 }
}
