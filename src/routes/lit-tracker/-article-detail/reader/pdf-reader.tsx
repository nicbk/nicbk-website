import { EmbedPDF, useDocumentState } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
// Self-hosted rather than fetched from a CDN. `usePdfiumEngine`'s default is
// `https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@2.15.0/dist/pdfium.wasm`,
// which this site does not do: the decided CSP is `default-src 'self'`
// (research/security-privacy/app-security-headers.md) and the fonts are
// self-hosted for the same reason. Imported through Vite rather than copied
// into `public/` so the binary can never drift from the installed package.
import pdfiumWasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import {
  AnnotationLayer,
  useAnnotation,
  useAnnotationCapability,
} from '@embedpdf/plugin-annotation/react'
import {
  PagePointerProvider,
  useInteractionManagerCapability,
} from '@embedpdf/plugin-interaction-manager/react'
import { RenderLayer } from '@embedpdf/plugin-render/react'
import { Scroller, useScroll } from '@embedpdf/plugin-scroll/react'
import {
  SelectionLayer,
  useSelectionCapability,
} from '@embedpdf/plugin-selection/react'
import { Viewport } from '@embedpdf/plugin-viewport/react'
import { useZoom, ZoomGestureWrapper } from '@embedpdf/plugin-zoom/react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo } from 'react'
import { useRegisterReaderJump } from '../reader-jump'
import { AnnotationSelectionMenu } from './annotation-selection-menu'
import { useAnnotationSync } from './annotation-sync/use-annotation-sync'
import { isBlankPaper, PAPER_ATTRIBUTE } from './blank-paper'
import { liveToolFrom } from './click-away'
import { ClickAwayGuard } from './click-away-guard'
import { canCopyText } from './copy-permission'
import { ReaderNotice } from './reader-notice'
import { createReaderPlugins } from './reader-plugins'
import { deriveReaderState } from './reader-state'
import { InertReaderToolbar, ReaderToolbar } from './reader-toolbar'
import { SelectionCopyMenu } from './selection-copy-menu'
import { usePointerKind } from './touch-selection/pointer-kind'
import { READER_PANEL_ATTRIBUTE } from './touch-selection/reader-panel'
import { TouchSelection } from './touch-selection/touch-selection'
import { useHighlightBoxTool } from './use-highlight-box-tool'
import { useReaderCopyShortcut } from './use-reader-copy-shortcut'
import { useReadingMode } from './use-reading-mode'
import { useSelectionCopy } from './use-selection-copy'
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
  const { state: annotation, provides: annotationScope } =
    useAnnotation(articleId)
  const { provides: annotations } = useAnnotationCapability()
  const { provides: interaction } = useInteractionManagerCapability()
  const { provides: selectionScope } = useSelectionCapability()

  // The marks and the rows, kept saying the same thing. Mounted here because
  // this is the first place the annotation scope exists; everything it decides
  // is in `annotation-sync/`.
  useAnnotationSync(articleId)

  // The thirteenth tool, which is this reader's rather than the engine's and so
  // has to be handed to it. See `use-highlight-box-tool.ts`.
  useHighlightBoxTool(annotations)

  // Gives the paper back to the browser to scroll, when no tool is live. Before
  // this, every page carried `touch-action: none` and a thumb moved nothing —
  // see `reading-mode.ts` for why one flag does all of that.
  useReadingMode(interaction)

  /**
   * Which kind of pointer is in the reader's hand — see
   * `touch-selection/pointer-kind.ts` for why this cannot be asked of the
   * event. Read here for the one decision that is the whole document's rather
   * than a page's: whether a long press is also allowed to raise the browser's
   * own menu.
   */
  const pointerKind = usePointerKind()

  const {
    copy,
    state: copyState,
    hasSelection,
  } = useSelectionCopy(articleId, selectionScope)
  useReaderCopyShortcut({ hasSelection, copy })

  /**
   * Escape puts down whatever the reader had picked up.
   *
   * Three things can be "held" at once — a stretch of selected text, a selected
   * mark, and a live tool — and each has its own way out (click elsewhere, click
   * the paper, choose "select" in the menu). Escape is the one gesture that
   * means "never mind" everywhere else on this site, and without it a selection
   * made by accident had to be undone by working out which of the three it was.
   *
   * On the window rather than the viewport: the viewport is not focusable, so a
   * listener there would only fire when a control inside it happened to hold
   * focus — which is exactly when Escape is least needed.
   */
  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }
      selectionScope?.clear()
      annotationScope?.deselectAnnotation()
      annotationScope?.setActiveTool(null)
    }

    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [selectionScope, annotationScope])

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

  /**
   * Whether this paper allows its text to be taken, asked once here and handed
   * to the control that has to answer for it. `copy-permission.ts` explains why
   * the question is asked at all rather than left to fail silently.
   */
  const canCopy = canCopyText(documentState?.document?.permissions)

  /**
   * The way in from the sidebar's annotations list (`reader-jump.tsx`): a row
   * names a stored 0-based `page_index`, the scroller counts from 1.
   *
   * Clamped rather than rejected, the same treatment the page field gives a
   * typed 900 (`use-page-field.ts`): a row can name a page this file does not
   * have — the PDF was replaced, or the count is not known yet — and the end of
   * the document is a better answer than a jump that silently does nothing.
   */
  const jumpToPage = useCallback(
    (pageIndex: number) => {
      if (totalPages < 1) {
        return
      }
      const pageNumber = Math.min(Math.max(pageIndex + 1, 1), totalPages)
      scrollScope?.scrollToPage({ pageNumber })
    },
    [scrollScope, totalPages],
  )
  useRegisterReaderJump(jumpToPage)

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
    <div
      className={styles.reader}
      /*
       * Says that something on the paper is selected, so the stylesheet can let
       * a finger scroll even while a tool is live (`pdf-reader.module.css`).
       *
       * **An attribute rather than a prop passed down**, because what it
       * changes is `touch-action` on every page, and those pages are the
       * library's own elements: a rule matching from here reaches all of them
       * without this reader reaching into any. It is `undefined` rather than
       * `false` so the attribute is absent, not present-and-empty, which is
       * what the selector tests.
       */
      data-mark-selected={annotation.selectedUids.length > 0 ? '' : undefined}
    >
      {state === 'ready' ? (
        <Viewport
          documentId={articleId}
          className={styles.viewport}
          // Canvas-rendered pages are images, not text, and nothing here
          // pretends otherwise. What the label gives assistive tech is the
          // region's purpose and a name to navigate by.
          role="region"
          aria-label="pdf reader"
          // What "the reader's panel" is recognised by, so the magnifier can
          // stay inside it — see `touch-selection/reader-panel.ts`. The role and
          // label above are for assistive technology and are not a selector.
          {...{ [READER_PANEL_ATTRIBUTE]: '' }}
        >
          {/*
           * Pinch to zoom — on a trackpad and on a touchscreen alike.
           *
           * **The library's, not this project's.** EmbedPDF ships this
           * component with both gestures on by default; the headless build
           * simply never mounts anything for you, so the reader had zoom
           * controls and no zoom gestures until this was rendered. Writing
           * pinch maths beside a working implementation is the duplication the
           * project's guidelines forbid, and this is precisely the kind of
           * thing the headless decision traded away — the drop-in viewer mounts
           * it, and choosing headless means choosing to mount it deliberately.
           *
           * **Inside the viewport, wrapping the pages.** It is not free to sit
           * anywhere: it reads the viewport element from context to attach its
           * listeners, and it measures and transforms *its own* element to
           * preview the zoom mid-gesture and to keep the pages centred. Outside
           * the viewport the gestures do not fire; beside the scroller rather
           * than around it, they zoom about nothing.
           *
           * Both flags are the component's own defaults, and are passed anyway:
           * a default that is the whole purpose of a dependency should be
           * visible in the code that depends on it, and a future version
           * changing its mind must not silently remove a feature.
           */}
          <ZoomGestureWrapper
            documentId={articleId}
            enablePinch={true}
            // ctrl/cmd + wheel, which is what a trackpad pinch emits. Without
            // it the browser's own page zoom answers instead, and the reader
            // watches the whole interface grow rather than the paper.
            enableWheel={true}
          >
            <Scroller
              documentId={articleId}
              renderPage={({ pageIndex, width, height }) => (
                <div
                  key={pageIndex}
                  className={styles.page}
                  style={{ width, height }}
                >
                  {/*
                   * Three layers over each page, and the order is the order they
                   * stack: the paper, the text selection over it, the marks over
                   * that. `PagePointerProvider` is what turns a pointer event on
                   * this element into a point on the page — the coordinate space
                   * every tool draws in, and the reason a mark made at 61% is in
                   * the right place at 200%.
                   */}
                  <PagePointerProvider
                    documentId={articleId}
                    pageIndex={pageIndex}
                    className={styles.pageLayers}
                    /*
                     * Clicking away from a mark puts it down. On `pointerdown`
                     * rather than `click` so the mark is released as the press
                     * begins — by the time a click completes the reader may
                     * already be dragging a new one.
                     *
                     * **A mouse only.** A finger's press cannot be answered
                     * here, because the same press may turn out to be a scroll,
                     * and a scroll must leave the mark exactly as it was
                     * (decided with the user, 2026-08-24). So a finger's
                     * deselect waits for a release that did not travel, and
                     * `ClickAwayGuard` — which is watching the whole press
                     * anyway — is what does it.
                     */
                    onPointerDown={(event) => {
                      if (
                        event.pointerType !== 'touch' &&
                        isBlankPaper(event.target)
                      ) {
                        annotationScope?.deselectAnnotation()
                      }
                    }}
                    /*
                     * A long press on a phone must mean one thing, and here it
                     * means "select this word". Chrome on Android would
                     * otherwise answer the same gesture with its own menu for
                     * the page image — two affordances for one press, one of
                     * them offering to save a picture of the paper.
                     *
                     * Only for a press that began as touch: a right-click is a
                     * different gesture with a different answer, and taking the
                     * context menu off the paper for mouse users would be a
                     * silent regression nobody asked for. iOS Safari raises no
                     * such event at all — `-webkit-touch-callout` is that half,
                     * and it is in the stylesheet.
                     */
                    onContextMenu={(event) => {
                      if (pointerKind.current.kind === 'touch') {
                        event.preventDefault()
                      }
                    }}
                  >
                    {/*
                     * Spends the press that puts a mark down on putting it
                     * down. Renders nothing; it registers a pointer handler
                     * ahead of the live tool so the press that deselects does
                     * not also make a mark — and, for a finger, so the tool
                     * never hears that press at all and the paper is free to
                     * scroll under it. See `click-away-guard.tsx`.
                     */}
                    <ClickAwayGuard
                      documentId={articleId}
                      pageIndex={pageIndex}
                      isMarkSelected={() =>
                        (annotationScope?.getSelectedAnnotationIds().length ??
                          0) > 0
                      }
                      activeTool={() =>
                        liveToolFrom(annotations, annotation.activeToolId)
                      }
                      onDeselect={() => annotationScope?.deselectAnnotation()}
                    />
                    {/*
                     * Selecting a passage with a finger: the long press, the
                     * handles that adjust what it caught, and the magnifier
                     * that makes a character-precise drag possible on glass.
                     *
                     * **Before the selection layer, and that is the lesser
                     * half of being first.** Handlers registered without a mode
                     * are walked in the order they were registered, and this
                     * one has to be ahead of EmbedPDF's text handler or a thumb
                     * drags a selection out while trying to scroll. Position in
                     * this list is not what settles that — React runs every
                     * layout effect before any ordinary one, so
                     * `use-hold-to-select.ts` registers in a layout effect and
                     * wins regardless. This still sits here because reading
                     * order should match the order things happen in, and
                     * because it paints above the selection either way, which
                     * its own stylesheet arranges.
                     */}
                    <TouchSelection
                      documentId={articleId}
                      pageIndex={pageIndex}
                    />
                    <RenderLayer
                      documentId={articleId}
                      pageIndex={pageIndex}
                      className={styles.pageImage}
                      // What "the reader clicked the bare paper" is recognised by
                      // — see `blank-paper.ts`.
                      {...{ [PAPER_ATTRIBUTE]: '' }}
                      // The page is an `<img>`, and dragging an image is a
                      // browser-native drag-and-drop: press and pull across a
                      // paragraph and what moves is a ghost of the page, not a
                      // text selection. It made highlighting feel broken — the
                      // reader had to "drag in weird ways" to select anything
                      // (user-reported). Nothing here wants that gesture: every
                      // drag over a page belongs to the reader's own tools.
                      draggable={false}
                    />
                    <SelectionLayer
                      documentId={articleId}
                      pageIndex={pageIndex}
                      // What a reader can do with a passage they have selected.
                      // The same mechanism as the mark's menu below, deliberately
                      // — see `selection-copy-menu.tsx`.
                      selectionMenu={(menu) => (
                        <SelectionCopyMenu
                          {...menu}
                          canCopy={canCopy}
                          state={copyState}
                          onCopy={copy}
                        />
                      )}
                    />
                    <AnnotationLayer
                      documentId={articleId}
                      pageIndex={pageIndex}
                      // What a reader can do to the mark they have selected.
                      // EmbedPDF calls this for every annotation on the page and
                      // the control declines to draw for the unselected ones.
                      selectionMenu={(menu) => (
                        <AnnotationSelectionMenu
                          {...menu}
                          onDelete={(page, annotationId) =>
                            annotationScope?.deleteAnnotation(
                              page,
                              annotationId,
                            )
                          }
                          /*
                           * One patch, one column. The bridge does the rest: an
                           * update commits at once with no history plugin
                           * registered, and `contents` is already part of the
                           * fingerprint it compares, so a note reaches the row —
                           * and the sidebar — through the path every other change
                           * to a mark already takes.
                           */
                          onSaveNote={(page, annotationId, note) =>
                            annotationScope?.updateAnnotation(
                              page,
                              annotationId,
                              {
                                contents: note,
                              },
                            )
                          }
                        />
                      )}
                    />
                  </PagePointerProvider>
                </div>
              )}
            />
          </ZoomGestureWrapper>
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
        activeToolId={annotation.activeToolId}
        onSelectTool={(toolId) => annotationScope?.setActiveTool(toolId)}
        // The scopes exist as soon as the plugins register, but they have
        // nothing to act on until the document is drawn.
        disabled={state !== 'ready'}
        actions={actions}
      />
    </div>
  )
}
