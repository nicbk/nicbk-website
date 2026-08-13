import { EmbedPDF, useDocumentState } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
// Self-hosted rather than fetched from a CDN. `usePdfiumEngine`'s default is
// `https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@2.15.0/dist/pdfium.wasm`,
// which this site does not do: the decided CSP is `default-src 'self'`
// (research/security-privacy/app-security-headers.md) and the fonts are
// self-hosted for the same reason. Imported through Vite rather than copied
// into `public/` so the binary can never drift from the installed package.
import pdfiumWasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import { RenderLayer } from '@embedpdf/plugin-render/react'
import { Scroller, useScroll } from '@embedpdf/plugin-scroll/react'
import { Viewport } from '@embedpdf/plugin-viewport/react'
import { useZoom } from '@embedpdf/plugin-zoom/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { ReaderNotice } from './reader-notice'
import { createReaderPlugins } from './reader-plugins'
import { deriveReaderState } from './reader-state'
import { InertReaderToolbar, ReaderToolbar } from './reader-toolbar'
import { absoluteAssetUrl } from './wasm-url'
import styles from './pdf-reader.module.css'

/**
 * The paper itself: EmbedPDF's headless build, composed into this project's own
 * UI.
 *
 * **Browser-only.** Never imported directly — `article-reader.tsx` loads it
 * behind `ClientOnly`, and that boundary is what keeps the wasm import above
 * off the server. See that file for why the engine cannot server-render.
 *
 * Headless by decision, not by default: EmbedPDF also ships a fully styled
 * drop-in viewer, and it was passed over precisely because the prebuilt UI of
 * the alternatives felt janky
 * (research/technologies/pdf-reader-annotations.md). Adopting it here would
 * discard the reason the library was chosen.
 *
 * Which plugins it is built from, and where the document comes from, live in
 * `reader-plugins.ts` — configuration that can be asserted without an engine.
 */

interface PdfReaderProps {
  articleId: string
  /** The page's own controls, for the end of the toolbar. See `ReaderToolbar`. */
  actions?: ReactNode
}

export function PdfReader({ articleId, actions }: PdfReaderProps) {
  const {
    engine,
    isLoading: isEngineLoading,
    error: engineError,
  } = usePdfiumEngine({
    // Absolute, because the engine fetches this from inside a `blob:` worker
    // that cannot resolve a root-relative path — see `wasm-url.ts`.
    wasmUrl: absoluteAssetUrl(pdfiumWasmUrl, window.location.origin),
    // Explicitly off. When a PDF references a font it does not embed, EmbedPDF
    // can fetch a substitute from jsdelivr; `undefined` already disables that
    // today, and saying so keeps a future default from quietly making a
    // reading tool phone home about which papers are being read.
    fontFallback: null,
  })

  // Memoized because a new registration array on every render would re-register
  // every plugin, which means re-opening the document.
  const plugins = useMemo(() => createReaderPlugins(articleId), [articleId])

  if (!engine) {
    // No engine means no plugins, so there are no scopes to drive the toolbar
    // with — it renders inert rather than not at all, because a paper that
    // never arrives must not take the page's frame with it.
    return (
      <div className={styles.reader}>
        <div className={styles.notice}>
          <ReaderNotice
            state={deriveReaderState({
              isEngineLoading,
              engineError,
              documentStatus: null,
            })}
          />
        </div>
        {/* Last, for the paint-order reason `ReaderDocument` explains. */}
        <InertReaderToolbar actions={actions} />
      </div>
    )
  }

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      <ReaderDocument articleId={articleId} actions={actions} />
    </EmbedPDF>
  )
}

/**
 * The document and its controls, once the engine exists.
 *
 * Separate from the component above because EmbedPDF's hooks only work inside
 * its provider — this is the first place the document's state, its pages, and
 * its zoom can be read at all.
 */
function ReaderDocument({ articleId, actions }: PdfReaderProps) {
  const documentState = useDocumentState(articleId)
  const { state: scroll, provides: scrollScope } = useScroll(articleId)
  const { state: zoom, provides: zoomScope } = useZoom(articleId)

  const state = deriveReaderState({
    isEngineLoading: false,
    engineError: null,
    documentStatus: documentState?.status ?? null,
  })

  /**
   * The page count comes from the document, not from `useScroll`.
   *
   * That hook seeds its total from `getTotalPages()` in an effect that runs as
   * soon as the plugin registers — before the document is laid out, when the
   * answer is 0 — and then only revises it when a page *change* event fires. So
   * a paper that has been opened and not yet scrolled reports "1 / 0", which is
   * what this said before the count was taken from the one place that knows it
   * the moment the document is loaded.
   */
  const totalPages = documentState?.document?.pageCount ?? 0

  return (
    // The document comes first and the toolbar second, which is the opposite of
    // how they are drawn. Paint order, not preference: EmbedPDF's scroller wraps
    // its pages in a `position: relative` container of its own, so an *earlier*
    // positioned sibling can only paint above it by claiming a `z-index` — and a
    // `z-index` here would put this bar above every portalled popup on the page,
    // which render at the end of the document with none of their own. The article
    // menu would open underneath its own trigger and a backdrop would dim
    // everything except this strip (the collection's toolbar hit exactly this;
    // see collection-toolbar.module.css). Ordered last, the bar paints above the
    // document and below the portals, with no stacking context anywhere.
    //
    // It costs nothing in tab order: the viewport carries `tabindex="-1"` and
    // holds no focusable content, so the toolbar's controls are still the first
    // thing reached inside the reader.
    <div className={styles.reader}>
      {state === 'ready' ? (
        <Viewport
          documentId={articleId}
          className={styles.viewport}
          // Canvas-rendered pages are images, not text, and nothing here
          // pretends otherwise. What the label gives assistive tech is the
          // region's purpose and a name to navigate by.
          role="region"
          aria-label="pdf reader"
        >
          <Scroller
            documentId={articleId}
            renderPage={({ pageIndex, width, height }) => (
              <div
                key={pageIndex}
                className={styles.page}
                style={{ width, height }}
              >
                <RenderLayer
                  documentId={articleId}
                  pageIndex={pageIndex}
                  className={styles.pageImage}
                />
              </div>
            )}
          />
        </Viewport>
      ) : (
        <div className={styles.notice}>
          <ReaderNotice state={state} />
        </div>
      )}

      <ReaderToolbar
        currentPage={scroll.currentPage}
        totalPages={totalPages}
        onGoToPage={(pageNumber) => scrollScope?.scrollToPage({ pageNumber })}
        onPreviousPage={() => scrollScope?.scrollToPreviousPage()}
        onNextPage={() => scrollScope?.scrollToNextPage()}
        currentZoom={zoom.currentZoomLevel}
        zoomLevel={zoom.zoomLevel}
        onZoomIn={() => zoomScope?.zoomIn()}
        onZoomOut={() => zoomScope?.zoomOut()}
        onRequestZoom={(level) => zoomScope?.requestZoom(level)}
        // The scopes exist as soon as the plugins register, but they have
        // nothing to act on until the document is drawn.
        disabled={state !== 'ready'}
        actions={actions}
      />
    </div>
  )
}
