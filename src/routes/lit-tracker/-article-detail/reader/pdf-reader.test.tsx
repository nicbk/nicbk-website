import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  current: { activeToolId: null as string | null },
}))
/** What the zoom-gesture wrapper was mounted with, for the assertions below. */
const zoomGestureProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}))

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
  const { createElement } = await import('react')
  return {
    useScroll: () => ({ state: scrollState.current, provides: scrollScope }),
    Scroller: ({ documentId }: { documentId: string }) =>
      createElement('p', null, `pages:${documentId}`),
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
    Viewport: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) =>
      createElement('div', props, children),
  }
})
vi.mock('@embedpdf/plugin-render/react', () => ({ RenderLayer: () => null }))
vi.mock('@embedpdf/plugin-annotation/react', () => ({
  useAnnotation: () => ({
    state: annotationState.current,
    provides: annotationScope,
  }),
  useAnnotationCapability: () => ({ provides: annotationCapability }),
  AnnotationLayer: () => null,
}))
vi.mock('@embedpdf/plugin-selection/react', () => ({
  SelectionLayer: () => null,
  useSelectionCapability: () => ({ provides: selectionScope }),
}))
vi.mock('@embedpdf/plugin-interaction-manager/react', async () => {
  const { createElement, Fragment } = await import('react')
  return {
    PagePointerProvider: ({ children }: { children: React.ReactNode }) =>
      createElement(Fragment, null, children),
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
  annotationState.current = { activeToolId: null }
  zoomGestureProps.current = null
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
      annotationState.current = { activeToolId: 'ink' }
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
