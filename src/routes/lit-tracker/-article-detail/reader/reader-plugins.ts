import { createPluginRegistration } from '@embedpdf/core'
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager'
import { RenderPluginPackage } from '@embedpdf/plugin-render'
import { ScrollPluginPackage, ScrollStrategy } from '@embedpdf/plugin-scroll'
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
 * The five plugins the viewer needs, and no more.
 *
 * Thumbnails, text search, printing, rotation, and page spreads all exist and
 * none is asked for by anything decided; each would be a UI decision with no
 * decision behind it. Task 4 adds the annotation plugin here — with the two
 * peers it requires — when it adds the tools that use it.
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
    createPluginRegistration(ZoomPluginPackage, {
      // A paper in a panel that is often half a screen wide: fitting the width
      // is the zoom a reader would otherwise set by hand every time.
      defaultZoomLevel: ZoomMode.FitWidth,
    }),
  ]
}
