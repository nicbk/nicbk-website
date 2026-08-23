import { createPluginRegistration } from '@embedpdf/core'
import { AnnotationPluginPackage } from '@embedpdf/plugin-annotation'
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager'
import { InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager'
import { RenderPluginPackage } from '@embedpdf/plugin-render'
import { ScrollPluginPackage, ScrollStrategy } from '@embedpdf/plugin-scroll'
import { SelectionPluginPackage } from '@embedpdf/plugin-selection'
import { TilingPluginPackage } from '@embedpdf/plugin-tiling'
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport'
import { ZoomMode, ZoomPluginPackage } from '@embedpdf/plugin-zoom'

/**
 * What the reader is made of, and where it gets the paper.
 *
 * Separated from the component so the two things worth pinning can be asserted
 * without an engine: **which plugins are registered** and **what URL the
 * document is loaded from**. The component around this renders a WebAssembly
 * canvas that jsdom cannot draw; this is configuration, and configuration is
 * exactly the kind of thing that breaks quietly.
 */

/**
 * The route task 2 shipped: same-origin, session-authorized, and never
 * presigned.
 *
 * The bytes come through this app server so file access is authorized in the
 * same place as every other piece of user data
 * (research/security-privacy/pdf-and-annotation-data-protection.md). A presigned
 * Garage URL would be a bearer token, readable by whoever holds it independently
 * of any check this server makes — which is why the reader is never given one,
 * and why this is a path rather than a full URL to somewhere else.
 */
export function articlePdfUrl(articleId: string): string {
  return `/api/lit-tracker/articles/${articleId}/pdf`
}

/**
 * How the paper is cut up at high zoom, and why it is cut up at all.
 *
 * **The whole page used to be one image.** `RenderLayer` draws a page at the
 * current scale, so the picture's *area* grows with the square of the zoom, it
 * is redrawn from scratch on every zoom change, and it is paid for every page
 * the scroller has mounted rather than the one being read. Measured at 400% in
 * a 500px window: five bitmaps of 4896 × 6336, about 620 MB of decoded image to
 * show a few paragraphs, and 3.8 seconds to redraw the first page after a zoom
 * step. On a phone that is not slow, it is fatal — the tab is reloaded by the
 * platform (feature #14's `research.md` has the measurements).
 *
 * Tiling renders the *visible region* at full magnification instead, in squares
 * of `tileSize` screen pixels, over a base layer pinned to a low scale so
 * nothing is ever blank. What a zoom costs then follows the size of the panel,
 * not the size of the page.
 *
 * Every value is the plugin's own default, and every one is written down anyway
 * — the config's type demands all three, and a number that decides how much
 * memory a reader uses should be visible in the code that chose it.
 */
export const TILING = {
  /** The side of one square tile, in screen pixels. */
  tileSize: 768,
  /**
   * How far neighbouring tiles overlap, so the joins do not show as hairlines
   * when the browser rounds a fractional position.
   */
  overlapPx: 2.5,
  /**
   * How many rings of tiles to render *outside* the viewport, in advance.
   *
   * Zero: pre-rendering is exactly the cost this feature exists to stop paying,
   * and paying a little of it everywhere would be a strange way to begin. If
   * scrolling at high zoom turns out to need a ring, that is a number to raise
   * with a measurement beside it.
   */
  extraRings: 0,
} as const

/**
 * The scale the base layer under the tiles is drawn at.
 *
 * **Fixed, which is the point.** Pinning it means the base is rendered once per
 * page and never again — a zoom changes only which tiles are wanted. Left to
 * follow the document's scale, as it did before tiling, it would go on being
 * the expensive thing that tiles were introduced to avoid.
 *
 * `1` rather than something smaller because this is what shows while tiles are
 * still arriving, and at the zoom levels a paper is actually read at it is
 * sharper than the tiles are hurried.
 */
export const BASE_PAGE_SCALE = 1

/**
 * The nine plugins the reader needs, and no more.
 *
 * Thumbnails, text search, printing, rotation, and page spreads all exist and
 * none is asked for by anything decided; each would be a UI decision with no
 * decision behind it.
 *
 * **Three of the nine are the annotation plugin and its dependencies.** The
 * plugin's manifest declares `requires: ['interaction-manager', 'selection']`,
 * and they are registered before it because the library's own documentation says
 * that order matters. The manifest also lists `history` as *optional* — that is
 * undo/redo, which is out of scope by decision, and its absence is why nothing
 * here works around it.
 *
 * **The document id is the article id.** EmbedPDF keys every scope — scroll,
 * zoom, viewport — by document id and lets the caller choose it, so using the
 * article's own makes those lookups deterministic: no waiting on
 * `activeDocumentId` to find out what the reader is showing.
 */
export function createReaderPlugins(articleId: string) {
  return [
    createPluginRegistration(DocumentManagerPluginPackage, {
      initialDocuments: [
        { url: articlePdfUrl(articleId), documentId: articleId },
      ],
    }),
    createPluginRegistration(ViewportPluginPackage),
    createPluginRegistration(ScrollPluginPackage, {
      defaultStrategy: ScrollStrategy.Vertical,
    }),
    createPluginRegistration(RenderPluginPackage),

    /*
     * After render, scroll and viewport, which its manifest declares it
     * requires — it draws with the first and asks the other two which part of
     * which page is on screen. See `TILING` above for what it is for.
     */
    createPluginRegistration(TilingPluginPackage, TILING),

    createPluginRegistration(ZoomPluginPackage, {
      // A paper in a panel that is often half a screen wide: fitting the width
      // is the zoom a reader would otherwise set by hand every time.
      defaultZoomLevel: ZoomMode.FitWidth,
    }),

    // The annotation plugin's two required dependencies, before it.
    createPluginRegistration(InteractionManagerPluginPackage),
    createPluginRegistration(SelectionPluginPackage),
    createPluginRegistration(AnnotationPluginPackage, {
      // Every default here is EmbedPDF's own except this one, and it is the
      // decided creation flow: the tool stays live after a mark is made, so a
      // reader marking six passages picks the tool once
      // (research/ui-ux/pages/lit-tracker/components/reader-annotation.md).
      deactivateToolAfterCreate: false,
    }),
  ]
}
