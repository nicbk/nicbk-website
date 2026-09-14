import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isBlankPaper, PAPER_ATTRIBUTE } from './blank-paper'
import { BASE_PAGE_SCALE } from './reader-plugins'

/**
 * The reader's own composition, with the engine mocked out.
 *
 * **What cannot be asserted here, stated plainly:** the output of this component
 * is a WebAssembly-rendered canvas, and jsdom draws none of it. No test in this
 * file says "the page turned" — the browser pass in
 * `features/article-detail-and-reader/tasks/pdf-reader/status.md` is the
 * evidence for that, and the restored e2e suite will owe the assertion.
 *
 * What *is* asserted is everything around the engine: which of the four states
 * renders, that the toolbar survives all of them, and that its controls reach
 * the scopes EmbedPDF hands back. Those are the parts that break silently.
 */

const engine = vi.hoisted(() => ({
  current: {
    engine: {} as unknown,
    isLoading: false,
    error: null as Error | null,
  },
}))
const documentState = vi.hoisted(() => ({
  current: null as {
    status: string
    document: { pageCount: number } | null
  } | null,
}))
const scrollScope = vi.hoisted(() => ({
  scrollToPage: vi.fn(),
  scrollToNextPage: vi.fn(),
  scrollToPreviousPage: vi.fn(),
}))
const zoomScope = vi.hoisted(() => ({
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  requestZoom: vi.fn(),
}))
const scrollState = vi.hoisted(() => ({
  current: { currentPage: 1, totalPages: 0 },
}))
const annotationScope = vi.hoisted(() => ({
  setActiveTool: vi.fn(),
  deselectAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
}))
const selectionScope = vi.hoisted(() => ({
  clear: vi.fn(),
  copyToClipboard: vi.fn(),
  // The two hooks the copy path subscribes with. Each returns its unsubscribe,
  // which is what the effects clean up with.
  onCopyToClipboard: vi.fn(() => () => {}),
  onSelectionChange: vi.fn(() => () => {}),
}))
/**
 * The document-wide capability, as distinct from the per-document scope above.
 * The reader reaches for it to register the one tool that is its own rather than
 * the engine's — see `use-highlight-box-tool.ts`.
 */
const annotationCapability = vi.hoisted(() => ({
  getTool: vi.fn((_toolId: string) => undefined as unknown),
  addTool: vi.fn(),
}))
const annotationState = vi.hoisted(() => ({
  current: {
    activeToolId: null as string | null,
    // What the reader reads to say a mark is selected, so a finger can scroll
    // the paper while one is — see `pdf-reader.module.css`.
    selectedUids: [] as string[],
  },
}))
/**
 * The interaction manager, which owns `touch-action` on every page. The reader
 * replaces its default mode so a thumb can scroll — see `reading-mode.ts`.
 */
const interactionCapability = vi.hoisted(() => ({ registerMode: vi.fn() }))
/** What the zoom-gesture wrapper was mounted with, for the assertions below. */
const zoomGestureProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}))
/**
 * The viewport, which the selection drag scrolls when a finger reaches the edge
 * of the panel. Scoped to a document like every other capability here.
 */
const viewportScope = vi.hoisted(() => ({
  getMetrics: vi.fn(),
  scrollTo: vi.fn(),
}))
const viewportCapability = vi.hoisted(() => ({
  forDocument: vi.fn(() => viewportScope),
  getViewportGap: () => 10,
}))
/** The scroll capability, which only the reading position is handed. */
const scrollCapability = vi.hoisted(() => ({ onScroll: vi.fn() }))
/** What the reading position was mounted with. */
const readingPosition = vi.hoisted(() => ({
  current: null as {
    saved?: unknown
    save?: (position: { page: number; offset: number }) => void
  } | null,
}))
/** What the selection drag was mounted with. */
const selectionDrag = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}))
/** What the selection finisher was mounted with. */
const finishSelection = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}))
/** Every marking this reader asked for, in order. */
const marked = vi.hoisted(() => [] as Record<string, unknown>[])

vi.mock('@embedpdf/engines/react', () => ({
  usePdfiumEngine: () => engine.current,
}))
vi.mock('@embedpdf/core/react', async () => {
  const { createElement, Fragment } = await import('react')
  return {
    // A pass-through: what matters is what renders inside it, not that EmbedPDF
    // builds a registry.
    EmbedPDF: ({ children }: { children: React.ReactNode }) =>
      createElement(Fragment, null, children),
    useDocumentState: () => documentState.current,
  }
})
vi.mock('@embedpdf/plugin-scroll/react', async () => {
  const { createElement, Fragment } = await import('react')
  return {
    useScroll: () => ({ state: scrollState.current, provides: scrollScope }),
    useScrollCapability: () => ({ provides: scrollCapability }),
    /*
     * Renders one page through the callback the real scroller virtualizes with,
     * so what a page is *made of* can be asserted — the layers over the paper,
     * their order, and which of them a press lands on. The `pages:` marker
     * stays because the state tests use it to say the document is drawn at all.
     */
    Scroller: ({
      documentId,
      renderPage,
    }: {
      documentId: string
      renderPage: (page: {
        pageIndex: number
        width: number
        height: number
        scale: number
      }) => React.ReactNode
    }) =>
      createElement(
        Fragment,
        null,
        createElement('p', null, `pages:${documentId}`),
        renderPage({ pageIndex: 0, width: 600, height: 800, scale: 1.6934 }),
      ),
  }
})
vi.mock('@embedpdf/plugin-zoom/react', async () => {
  const { createElement } = await import('react')
  return {
    useZoom: () => ({
      state: { currentZoomLevel: 1.6934, zoomLevel: 'fit-width' },
      provides: zoomScope,
    }),
    /*
     * The pinch/wheel wrapper, recorded rather than simulated. jsdom has no
     * touch and no compositor, so the gesture itself cannot be exercised here —
     * what *can* be, and what breaks silently, is where it sits in the tree and
     * what it is configured with. It renders its children so the assertions
     * about the document's structure still see them.
     */
    ZoomGestureWrapper: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) => {
      zoomGestureProps.current = props
      return createElement('div', { 'data-zoom-gestures': '' }, children)
    },
  }
})
vi.mock('@embedpdf/plugin-viewport/react', async () => {
  const { createElement } = await import('react')
  return {
    useViewportCapability: () => ({ provides: viewportCapability }),
    Viewport: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) =>
      createElement('div', props, children),
  }
})
/*
 * The drag that adjusts a touch selection, recorded rather than driven: it lives
 * at the window and moves the paper by the frame, and both of those are its own
 * test's business (`touch-selection/drag/use-selection-drag.test.tsx`). What is
 * asserted here is the wiring — that the reader mounts it once, for this
 * document, with the three capabilities it drives.
 */
/*
 * Restoring and saving the reading position, recorded rather than driven — its
 * order of events is `use-reading-position.test.ts`'s business. What is
 * asserted here is the wiring: this document, the scroller, the viewport's gap,
 * and the page's position in and out.
 */
vi.mock('./use-reading-position', () => ({
  useReadingPosition: (given: typeof readingPosition.current) => {
    readingPosition.current = given
  },
}))
vi.mock('./touch-selection/drag/use-selection-drag', () => ({
  useSelectionDrag: (given: Record<string, unknown>) => {
    selectionDrag.current = given
  },
}))
/*
 * Finishing a selection the library left open, recorded rather than driven: it
 * listens at the window and reads the plugin's own state, both of which are its
 * own test's business (`selection-finish/use-finish-selection.test.tsx`). What
 * is asserted here is that the reader mounts it once, for this document.
 */
vi.mock('./selection-finish/use-finish-selection', () => ({
  useFinishSelection: (given: Record<string, unknown>) => {
    finishSelection.current = given
  },
}))
/*
 * Marking, recorded rather than performed: what it builds is its own module's
 * business (`selection-finish/markup-marks.test.ts`). What is asserted here is
 * that choosing an action on the selection's menu reaches it with the tool the
 * reader meant, through the scopes this reader holds.
 */
vi.mock('./selection-finish/mark-selection', () => ({
  markSelection: (given: Record<string, unknown>) => {
    marked.push(given)
  },
}))
/*
 * The four layers a page is made of, each rendering a marker element carrying
 * the props worth asserting. They are stood in for rather than exercised — one
 * draws a WebAssembly-rendered bitmap and another a grid of them — but *which*
 * layers a page has, in what order, is exactly the kind of composition that
 * breaks silently.
 */
vi.mock('@embedpdf/plugin-render/react', async () => {
  const { createElement } = await import('react')
  return {
    RenderLayer: ({
      documentId: _documentId,
      pageIndex: _pageIndex,
      scale,
      ...props
    }: Record<string, unknown>) =>
      createElement('img', {
        ...props,
        'data-base-layer': '',
        'data-scale': String(scale),
      }),
  }
})
vi.mock('@embedpdf/plugin-tiling/react', async () => {
  const { createElement } = await import('react')
  return {
    TilingLayer: ({
      documentId: _documentId,
      pageIndex: _pageIndex,
      ...props
    }: Record<string, unknown>) =>
      createElement('div', { ...props, 'data-tile-layer': '' }),
  }
})
vi.mock('@embedpdf/plugin-annotation/react', async () => {
  const { createElement } = await import('react')
  return {
    useAnnotation: () => ({
      state: annotationState.current,
      provides: annotationScope,
    }),
    useAnnotationCapability: () => ({ provides: annotationCapability }),
    AnnotationLayer: ({
      annotationRenderers = [],
    }: {
      annotationRenderers?: { id: string }[]
    }) =>
      createElement('div', {
        'data-mark-layer': '',
        'data-renderers': annotationRenderers.map(({ id }) => id).join(','),
      }),
  }
})
// The link renderer is exercised in `link-target.test.tsx`; here it only has to
// reach the layer.
vi.mock('./link-target', () => ({ LINK_RENDERERS: [{ id: 'link' }] }))
vi.mock('@embedpdf/plugin-selection/react', async () => {
  const { createElement } = await import('react')
  return {
    /*
     * Renders the menu the real layer renders for a selection, so what this
     * reader hands that control — and what it does when one of its actions is
     * chosen — can be asserted. The marker stays because the layer-order tests
     * key on it.
     */
    SelectionLayer: ({
      selectionMenu,
    }: {
      selectionMenu?: (menu: Record<string, unknown>) => React.ReactNode
    }) =>
      createElement(
        'div',
        { 'data-text-layer': '' },
        selectionMenu?.({
          selected: true,
          menuWrapperProps: {},
          rect: { origin: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
        }),
      ),
    useSelectionCapability: () => ({ provides: selectionScope }),
  }
})
/*
 * The two of this reader's own components that a page mounts. Both are pointer
 * plumbing with their own tests and their own mocked interaction manager; what
 * this file is asserting is the paper underneath them.
 */
vi.mock('./click-away-guard', () => ({ ClickAwayGuard: () => null }))
vi.mock('./touch-selection/touch-selection', () => ({
  TouchSelection: () => null,
}))
vi.mock('./pinch/pinch-guard', () => ({ PinchGuard: () => null }))
vi.mock('@embedpdf/plugin-interaction-manager/react', async () => {
  const { createElement, Fragment } = await import('react')
  return {
    PagePointerProvider: ({ children }: { children: React.ReactNode }) =>
      createElement(Fragment, null, children),
    useInteractionManagerCapability: () => ({
      provides: interactionCapability,
    }),
  }
})
// The bridge between the engine and Zero, which has its own tests and needs a
// sync client this file has no business standing up. What belongs here is that
// the reader mounts it, which the mock's own call count would not prove any
// better than the import does.
vi.mock('./annotation-sync/use-annotation-sync', () => ({
  useAnnotationSync: () => {},
}))
// The wasm asset import: a URL string in the real build, and nothing jsdom can
// resolve otherwise.
vi.mock('@embedpdf/pdfium/pdfium.wasm?url', () => ({
  default: '/assets/pdfium.wasm',
}))

const { PdfReader } = await import('./pdf-reader')
const { ReaderJumpProvider, useReaderJump } = await import('../reader-jump')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

beforeEach(() => {
  engine.current = { engine: {}, isLoading: false, error: null }
  documentState.current = { status: 'loaded', document: { pageCount: 15 } }
  scrollState.current = { currentPage: 1, totalPages: 0 }
  annotationState.current = { activeToolId: null, selectedUids: [] }
  zoomGestureProps.current = null
  marked.length = 0
  vi.clearAllMocks()
})

describe('PdfReader', () => {
  describe('the states, which must be distinct', () => {
    it('says the engine is starting while its wasm loads', () => {
      engine.current = { engine: null, isLoading: true, error: null }
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(screen.getByText(/starting the reader/)).toBeInTheDocument()
      expect(screen.queryByText(`pages:${ARTICLE_ID}`)).toBeNull()
    })

    it('reports an engine that could not start, rather than waiting forever', () => {
      engine.current = {
        engine: null,
        isLoading: false,
        error: new Error('no wasm'),
      }
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
      expect(screen.queryByText(/starting|loading/)).toBeNull()
    })

    it('says the paper is loading once the engine is up', () => {
      documentState.current = { status: 'loading', document: null }
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(screen.getByText(/loading the paper/)).toBeInTheDocument()
    })

    it('reports a document that could not be fetched as failed, not as slow', () => {
      // The defect this exists for: an article whose PDF is missing from the
      // bucket must not look like a slow connection forever.
      documentState.current = { status: 'error', document: null }
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
      expect(screen.queryByText(/loading the paper/)).toBeNull()
    })

    it('draws the document once it is loaded', () => {
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(screen.getByText(`pages:${ARTICLE_ID}`)).toBeInTheDocument()
      expect(screen.queryByText(/loading|starting|could not/)).toBeNull()
    })
  })

  describe('the toolbar', () => {
    it('stays rendered in every state, including the ones with no engine', () => {
      // A paper that never arrives must not take the page's frame with it.
      for (const state of [
        { engine: null, isLoading: true, error: null },
        { engine: null, isLoading: false, error: new Error('no wasm') },
        { engine: {}, isLoading: false, error: null },
      ]) {
        engine.current = state
        const view = render(<PdfReader articleId={ARTICLE_ID} />)

        expect(
          screen.getByRole('group', { name: 'reader controls' }),
        ).toBeInTheDocument()
        view.unmount()
      }
    })

    it('is inert until there is a document to act on', () => {
      documentState.current = { status: 'loading', document: null }
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(screen.getByRole('button', { name: 'next page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'zoom in' })).toBeDisabled()
    })

    it('takes its page count from the document, not from the scroll hook', () => {
      // `useScroll` seeds its total in an effect that runs before the document
      // is laid out — when the answer is 0 — and revises it only on a page
      // *change*. Taken from there, a paper opened and not yet scrolled reported
      // "1 / 0". The document knows the moment it is loaded.
      scrollState.current = { currentPage: 1, totalPages: 0 }
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(screen.getByText(/15/)).toBeInTheDocument()
      expect(screen.queryByText(/\/\s*0/)).toBeNull()
    })

    it('turns pages through the scroll scope', async () => {
      scrollState.current = { currentPage: 3, totalPages: 0 }
      render(<PdfReader articleId={ARTICLE_ID} />)

      await userEvent.click(screen.getByRole('button', { name: 'next page' }))
      expect(scrollScope.scrollToNextPage).toHaveBeenCalledOnce()

      await userEvent.click(
        screen.getByRole('button', { name: 'previous page' }),
      )
      expect(scrollScope.scrollToPreviousPage).toHaveBeenCalledOnce()
    })

    it('jumps to a typed page through the scroll scope', async () => {
      render(<PdfReader articleId={ARTICLE_ID} />)
      const field = screen.getByRole('textbox', { name: 'page number' })

      await userEvent.clear(field)
      await userEvent.type(field, '9{Enter}')

      expect(scrollScope.scrollToPage).toHaveBeenCalledWith({ pageNumber: 9 })
    })

    it('zooms through the zoom scope', async () => {
      render(<PdfReader articleId={ARTICLE_ID} />)

      await userEvent.click(screen.getByRole('button', { name: 'zoom in' }))
      expect(zoomScope.zoomIn).toHaveBeenCalledOnce()

      await userEvent.click(screen.getByRole('button', { name: 'zoom out' }))
      expect(zoomScope.zoomOut).toHaveBeenCalledOnce()
    })

    it('reports the zoom the reader is actually looking at', () => {
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(
        screen.getByRole('button', { name: 'zoom level' }),
      ).toHaveTextContent('169%')
    })

    it('activates an annotation tool through the annotation scope', async () => {
      render(<PdfReader articleId={ARTICLE_ID} />)

      await userEvent.click(
        screen.getByRole('button', { name: /annotation tools/ }),
      )
      await userEvent.click(
        await screen.findByRole('menuitemradio', { name: 'highlight' }),
      )

      expect(annotationScope.setActiveTool).toHaveBeenCalledWith('highlight')
    })

    it('shows the live tool the engine reports, not one of its own', () => {
      // The active tool lives in the plugin's own state, keyed by document —
      // holding a second copy here is how a toolbar starts disagreeing with the
      // thing it controls.
      annotationState.current = { activeToolId: 'ink', selectedUids: [] }
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(
        screen.getByRole('button', {
          name: 'annotation tools, freehand selected',
        }),
      ).toBeInTheDocument()
    })

    it('carries the page’s own controls', () => {
      render(
        <PdfReader
          articleId={ARTICLE_ID}
          actions={<button type="button">options</button>}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'options' }),
      ).toBeInTheDocument()
    })
  })

  describe('putting things down', () => {
    it('drops the text selection, the mark and the tool on Escape', async () => {
      // Three things can be held at once and each has its own way out; Escape
      // is the one gesture that means "never mind" for all of them.
      render(<PdfReader articleId={ARTICLE_ID} />)

      await userEvent.keyboard('{Escape}')

      expect(selectionScope.clear).toHaveBeenCalledOnce()
      expect(annotationScope.deselectAnnotation).toHaveBeenCalledOnce()
      expect(annotationScope.setActiveTool).toHaveBeenCalledWith(null)
    })

    it('listens while focus is anywhere, not only inside the reader', () => {
      // The viewport is not focusable, so a listener on it would fire only when
      // some control inside happened to hold focus — which is exactly when
      // Escape is least needed.
      const listen = vi.spyOn(window, 'addEventListener')
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(listen).toHaveBeenCalledWith('keydown', expect.any(Function))
      listen.mockRestore()
    })

    it('stops listening once the reader is gone', async () => {
      // A keydown handler that outlives its scopes would go on calling into a
      // torn-down engine from every other page on the site.
      const stop = vi.spyOn(window, 'removeEventListener')
      const view = render(<PdfReader articleId={ARTICLE_ID} />)

      view.unmount()

      expect(stop).toHaveBeenCalledWith('keydown', expect.any(Function))
      stop.mockRestore()
    })
  })

  describe('the jump the annotations list steers it by', () => {
    /** Renders the reader inside the channel and hands the jump out. */
    function renderWithJump() {
      let jump: (pageIndex: number) => void = () => {}
      function Grab() {
        jump = useReaderJump()
        return null
      }
      render(
        <ReaderJumpProvider>
          <PdfReader articleId={ARTICLE_ID} />
          <Grab />
        </ReaderJumpProvider>,
      )
      return (pageIndex: number) => jump(pageIndex)
    }

    it('turns a stored 0-based page index into the scroller’s 1-based page', () => {
      const jump = renderWithJump()

      jump(4)

      expect(scrollScope.scrollToPage).toHaveBeenCalledWith({ pageNumber: 5 })
    })

    it('clamps a page this file does not have, like the typed field does', () => {
      // A row can outlive the document it described. The end of the paper is a
      // better answer than a jump that silently does nothing — the same
      // treatment `use-page-field.ts` gives a typed 900.
      const jump = renderWithJump()

      jump(99)

      expect(scrollScope.scrollToPage).toHaveBeenCalledWith({ pageNumber: 15 })
    })

    it('does not scroll a document that has not loaded', () => {
      documentState.current = { status: 'loading', document: null }
      const jump = renderWithJump()

      jump(2)

      expect(scrollScope.scrollToPage).not.toHaveBeenCalled()
    })
  })

  describe('zooming by gesture', () => {
    /**
     * The gesture cannot be exercised in jsdom — no touch, no compositor, and
     * the maths lives behind a WebAssembly engine. What these assert is the
     * composition, which is the part that fails silently: a wrapper in the
     * wrong place, or scoped to the wrong document, looks perfectly correct in
     * a diff and does nothing at all in a browser.
     */
    it('mounts the gesture wrapper for this document', () => {
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(zoomGestureProps.current).toMatchObject({
        // Scoped to the article, per the reader's keying convention. A wrapper
        // pointed at another document zooms nothing.
        documentId: ARTICLE_ID,
      })
    })

    it('enables both gestures explicitly, so a package default cannot remove one', () => {
      // Both are the component's own defaults today. Passing them is what makes
      // a future version changing its mind a test failure rather than a
      // silently missing feature.
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(zoomGestureProps.current).toMatchObject({
        enablePinch: true,
        enableWheel: true,
      })
    })

    it('wraps the pages rather than sitting beside them', () => {
      // It measures and transforms its own element to preview the zoom and to
      // keep the pages centred, so the pages have to be inside it. Beside them,
      // the gesture fires and zooms about nothing.
      const { container } = render(<PdfReader articleId={ARTICLE_ID} />)

      const wrapper = container.querySelector('[data-zoom-gestures]')
      expect(wrapper).not.toBeNull()
      expect(wrapper?.textContent).toContain(`pages:${ARTICLE_ID}`)
    })

    it('does not mount it while there is no document to zoom', () => {
      documentState.current = { status: 'loading', document: null }
      const { container } = render(<PdfReader articleId={ARTICLE_ID} />)

      expect(container.querySelector('[data-zoom-gestures]')).toBeNull()
    })
  })

  describe('giving the paper back to the browser', () => {
    it('replaces the engine’s default mode with one that declines raw touch', () => {
      // `touch-action` has no behaviour in jsdom, so what is checked is the
      // descriptor handed over. Without this the engine puts
      // `touch-action: none` on every page and a thumb moves nothing.
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(interactionCapability.registerMode).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pointerMode', wantsRawTouch: false }),
      )
    })

    it('registers it before any page could have mounted', () => {
      // The pointer provider fixes a page's `touch-action` when it attaches its
      // listeners and thereafter only on a mode *change* — and activating an
      // already-active mode returns early without emitting. So arriving late
      // means pages that never hear about it. Pages only render once the
      // document is ready, and this must already have run by then.
      documentState.current = { status: 'loading', document: null }
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(interactionCapability.registerMode).toHaveBeenCalled()
      expect(screen.queryByText(`pages:${ARTICLE_ID}`)).toBeNull()
    })
  })

  describe('scrolling with a mark selected', () => {
    /*
     * A tool's mode puts `touch-action: none` on every page so a drag can draw,
     * and the interaction manager models no "something is selected" state to
     * write anything else for. So the reader says so itself, and the stylesheet
     * lets a finger scroll while a mark is selected (decided with the user,
     * 2026-08-24). `touch-action` has no behaviour in jsdom; what is checked is
     * the state the rule keys on.
     */
    it('says when a mark is selected', () => {
      annotationState.current = { activeToolId: 'square', selectedUids: ['a'] }
      const { container } = render(<PdfReader articleId={ARTICLE_ID} />)

      expect(container.querySelector('[data-mark-selected]')).not.toBeNull()
    })

    it('says nothing when none is', () => {
      // Absent rather than present-and-empty, which is what the selector tests
      // — and which is what returns the paper to the tool.
      const { container } = render(<PdfReader articleId={ARTICLE_ID} />)

      expect(container.querySelector('[data-mark-selected]')).toBeNull()
    })
  })

  describe('the reading position', () => {
    it('is kept for this document, from the page’s position, through the page', () => {
      const onReadingPositionChange = vi.fn()
      render(
        <PdfReader
          articleId={ARTICLE_ID}
          readingPosition={{ page: 9, offset: 400 }}
          onReadingPositionChange={onReadingPositionChange}
        />,
      )

      expect(readingPosition.current).toMatchObject({
        documentId: ARTICLE_ID,
        scroll: scrollCapability,
        viewportGap: 10,
        saved: { page: 9, offset: 400 },
      })
      readingPosition.current?.save?.({ page: 3, offset: 12 })
      expect(onReadingPositionChange).toHaveBeenCalledWith({
        page: 3,
        offset: 12,
      })
    })

    it('has nothing saved when the page passes none', () => {
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(readingPosition.current?.saved).toBeNull()
    })
  })

  describe('the drag that crosses a page', () => {
    it('is mounted for the document, with what it drives', () => {
      /*
       * Once, here, rather than once per page — a handle is unmounted the moment
       * its boundary crosses onto the next page, and a drag owned by that
       * handle's page would end with it. The three capabilities are what it
       * needs: where the boundary goes, which page is under the finger, and the
       * paper to move when the finger reaches the edge.
       */
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(selectionDrag.current).toEqual({
        documentId: ARTICLE_ID,
        selection: selectionScope,
        scroll: scrollScope,
        viewport: viewportScope,
      })
      expect(viewportCapability.forDocument).toHaveBeenCalledWith(ARTICLE_ID)
    })

    it('mounts the finisher for the document, with what it acts through', () => {
      /*
       * Once, here, because a selection the library left open belongs to the
       * document rather than to either of the pages that half-own the gesture.
       * It needs the selection scope to ask and to finish, and the annotation
       * scope to mark with whatever tool is live.
       */
      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(finishSelection.current).toEqual({
        documentId: ARTICLE_ID,
        selection: selectionScope,
        annotations: annotationScope,
      })
    })
  })

  describe('marking from the selection', () => {
    it('marks with the tool the reader chose', async () => {
      /*
       * The whole point of the second route: no tool is activated, because
       * activating one would clear the selection being acted on. The tool is
       * looked up for its defaults and its marks are made directly.
       */
      const highlight = {
        id: 'highlight',
        interaction: { textSelection: true },
      }
      annotationCapability.getTool.mockReturnValue(highlight)
      render(<PdfReader articleId={ARTICLE_ID} />)

      await userEvent.click(screen.getByRole('button', { name: 'highlight' }))

      expect(annotationCapability.getTool).toHaveBeenCalledWith('highlight')
      expect(marked).toEqual([
        {
          selection: selectionScope,
          tools: annotationScope,
          tool: highlight,
          documentId: ARTICLE_ID,
        },
      ])
      expect(annotationScope.setActiveTool).not.toHaveBeenCalled()
    })

    it('marks nothing when the engine does not know the tool', () => {
      // Unreachable with the stock plugin, and silence is right if it happens:
      // the same judgement `use-highlight-box-tool.ts` makes.
      annotationCapability.getTool.mockReturnValue(undefined)
      render(<PdfReader articleId={ARTICLE_ID} />)

      screen.getByRole('button', { name: 'underline' }).click()

      expect(marked).toHaveLength(0)
    })
  })

  describe('the paper, in two layers', () => {
    /**
     * Everything a page draws, in the order it draws it.
     *
     * Order is the assertion, not an accident of how the query works: these
     * layers carry no `z-index`, so what paints over what is decided by where
     * they sit in the document.
     */
    const LAYER_MARKERS = [
      'data-base-layer',
      'data-tile-layer',
      'data-text-layer',
      'data-mark-layer',
    ]

    function layersOfAPage(): string[] {
      const { container } = render(<PdfReader articleId={ARTICLE_ID} />)
      const layers = container.querySelectorAll(
        LAYER_MARKERS.map((marker) => `[${marker}]`).join(', '),
      )

      return [...layers].map(
        (layer) =>
          LAYER_MARKERS.find((marker) => layer.hasAttribute(marker)) ?? '',
      )
    }

    it('draws the whole page once, and the visible part of it in tiles', () => {
      /*
       * The change this feature is: a single image of the page grows with the
       * square of the zoom and is redrawn for every mounted page on every zoom
       * change — 620 MB and 3.8 s a step at 400%, and a reloaded tab on a
       * phone. Tiles cost what the panel costs instead.
       */
      const layers = layersOfAPage()

      expect(layers).toContain('data-base-layer')
      expect(layers).toContain('data-tile-layer')
    })

    it('puts the tiles over the base, and both under everything else', () => {
      // The sharp part must cover the soft one, and neither may cover the text
      // selection or the marks — which is what a reader interacts with.
      expect(layersOfAPage()).toEqual([
        'data-base-layer',
        'data-tile-layer',
        'data-text-layer',
        'data-mark-layer',
      ])
    })

    it('hands the mark layer the reader’s own link renderer', () => {
      // Without it EmbedPDF's built-in renderer answers a link: an internal one
      // scrolls the reader away, and a URL opens in a new tab (#22).
      const { container } = render(<PdfReader articleId={ARTICLE_ID} />)

      expect(
        container
          .querySelector('[data-mark-layer]')
          ?.getAttribute('data-renderers'),
      ).toBe('link')
    })

    it('draws the base at a fixed scale, whatever the document is zoomed to', () => {
      // The zoom here is 169%, from the mocked zoom state. If the base followed
      // it, this feature would have changed nothing: that image is the whole
      // cost.
      const { container } = render(<PdfReader articleId={ARTICLE_ID} />)

      expect(
        container
          .querySelector('[data-base-layer]')
          ?.getAttribute('data-scale'),
      ).toBe(String(BASE_PAGE_SCALE))
    })

    it('leaves the bare paper recognisable, on exactly one layer', () => {
      /*
       * `blank-paper.ts` is how the reader knows a press landed on the page
       * rather than on something drawn over it, and two shipped behaviours rest
       * on it: the click that deselects a mark, and the one that must not also
       * create one. With two pictures of the page, only the one a press can
       * reach may answer — see the stylesheet test below for the other half.
       */
      const { container } = render(<PdfReader articleId={ARTICLE_ID} />)
      const paper = container.querySelectorAll(`[${PAPER_ATTRIBUTE}]`)

      expect(paper).toHaveLength(1)
      expect(isBlankPaper(paper[0] ?? null)).toBe(true)
      expect(paper[0]?.hasAttribute('data-base-layer')).toBe(true)
    })

    it('lets a press through the tiles to the paper beneath', () => {
      /*
       * The other half of the test above, and it is a stylesheet fact: the
       * tiles cover the page image exactly, so without this every press would
       * land on a tile, `isBlankPaper` would say no, and the click that puts a
       * mark down would stop working — silently, since the paper would look
       * perfectly normal. jsdom applies no stylesheets, so this is asserted
       * where it is written (`touch-selection/selection-handles.test.tsx`
       * checks a touch target's size the same way).
       */
      const stylesheet = readFileSync(
        join(__dirname, 'pdf-reader.module.css'),
        'utf8',
      )
      const tiles = stylesheet.slice(
        stylesheet.indexOf('{', stylesheet.indexOf('.pageTiles')) + 1,
        stylesheet.indexOf('}', stylesheet.indexOf('.pageTiles')),
      )

      expect(tiles).toMatch(/pointer-events:\s*none/)
    })
  })

  describe('the tool the reader adds to the engine', () => {
    it('hands the engine a highlight box built from its own square', () => {
      // The plugin does not export the square's pointer handler, so the tool
      // has to be cloned from a mounted plugin's resolved one. Nothing else in
      // this reader registers a tool at all.
      const square = { id: 'square', defaults: {}, pointerHandler: {} }
      annotationCapability.getTool.mockImplementation((id: string) =>
        id === 'square' ? square : undefined,
      )

      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(annotationCapability.addTool).toHaveBeenCalledTimes(1)
      expect(annotationCapability.addTool).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'highlightBox',
          pointerHandler: square.pointerHandler,
        }),
      )
    })

    it('does not add it twice, which would replace a live tool', () => {
      annotationCapability.getTool.mockImplementation((id: string) =>
        id === 'highlightBox' ? { id } : { id: 'square', defaults: {} },
      )

      render(<PdfReader articleId={ARTICLE_ID} />)

      expect(annotationCapability.addTool).not.toHaveBeenCalled()
    })
  })

  it('labels the document region for assistive technology', () => {
    // What the label gives is the region's purpose and a name to navigate by.
    // What is *not* claimed is that a canvas-rendered PDF is accessible text.
    render(<PdfReader articleId={ARTICLE_ID} />)

    expect(
      screen.getByRole('region', { name: 'pdf reader' }),
    ).toBeInTheDocument()
  })
})
