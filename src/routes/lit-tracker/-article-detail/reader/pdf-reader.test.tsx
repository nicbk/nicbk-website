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
vi.mock('@embedpdf/plugin-zoom/react', () => ({
  useZoom: () => ({
    state: { currentZoomLevel: 1.6934, zoomLevel: 'fit-width' },
    provides: zoomScope,
  }),
}))
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
// The wasm asset import: a URL string in the real build, and nothing jsdom can
// resolve otherwise.
vi.mock('@embedpdf/pdfium/pdfium.wasm?url', () => ({
  default: '/assets/pdfium.wasm',
}))

const { PdfReader } = await import('./pdf-reader')

const ARTICLE_ID = '018f5b6c-0000-7000-8000-000000000001'

beforeEach(() => {
  engine.current = { engine: {}, isLoading: false, error: null }
  documentState.current = { status: 'loaded', document: { pageCount: 15 } }
  scrollState.current = { currentPage: 1, totalPages: 0 }
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

  it('labels the document region for assistive technology', () => {
    // What the label gives is the region's purpose and a name to navigate by.
    // What is *not* claimed is that a canvas-rendered PDF is accessible text.
    render(<PdfReader articleId={ARTICLE_ID} />)

    expect(
      screen.getByRole('region', { name: 'pdf reader' }),
    ).toBeInTheDocument()
  })
})
