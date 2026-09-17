import type { PdfLinkAnnoObject } from '@embedpdf/models'
import { PdfAnnotationSubtype, PdfZoomMode } from '@embedpdf/models'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PreviewRegion } from './link-preview-region'
import type { PreviewedReference } from './use-previewed-reference'

/**
 * The preview popover.
 *
 * The engine, the renderer and the scroller are stubbed: jsdom cannot draw a
 * page. What is asserted is what the reader sees and can do — a crop of the
 * region, "go to" scrolling clear of the toolbar, and each state a lookup can
 * end in. The crop's content was checked in the browser.
 */

/*
 * Every stub hands back the *same* object on every render, as the real hooks
 * do: the preview's effect depends on their identity, and a fresh object per
 * render would re-run it forever.
 */
const stubs = vi.hoisted(() => {
  const scrollToPage = vi.fn()
  const renderPageRect = vi.fn()
  return {
    scrollToPage,
    renderPageRect,
    resolveLinkPreview: vi.fn(),
    usePreviewedReference: vi.fn<
      (
        articleId: string,
        region: PreviewRegion | null,
      ) => PreviewedReference | null
    >(() => null),
    registry: { registry: { getEngine: () => ({}) } },
    documentState: { document: { id: 'doc', pages: [] }, scale: 1.5 },
    annotation: { state: { byUid: {} } },
    render: { provides: { forDocument: () => ({ renderPageRect }) } },
    scroll: { provides: { scrollToPage } },
  }
})
const {
  scrollToPage,
  renderPageRect,
  resolveLinkPreview,
  usePreviewedReference,
} = stubs

vi.mock('@embedpdf/core/react', () => ({
  useRegistry: () => stubs.registry,
  useDocumentState: () => stubs.documentState,
}))
vi.mock('@embedpdf/plugin-annotation/react', () => ({
  useAnnotation: () => stubs.annotation,
}))
vi.mock('@embedpdf/plugin-render/react', () => ({
  useRenderCapability: () => stubs.render,
}))
vi.mock('@embedpdf/plugin-scroll/react', () => ({
  useScroll: () => stubs.scroll,
}))
vi.mock('./link-preview-source', () => ({
  resolveLinkPreview: stubs.resolveLinkPreview,
}))
// Sync, which jsdom has no client for. What the preview does with the answer is
// task 3's; that it asks for the region it drew is asserted here.
vi.mock('./use-previewed-reference', () => ({
  usePreviewedReference: stubs.usePreviewedReference,
}))

const { CitationPreview, goToCoordinates } = await import('./citation-preview')

const REGION: PreviewRegion = {
  pageIndex: 10,
  rect: { origin: { x: 105, y: 336 }, size: { width: 402, height: 33 } },
}

const LINK = {
  id: 'link',
  type: PdfAnnotationSubtype.LINK,
  pageIndex: 1,
  rect: { origin: { x: 1, y: 1 }, size: { width: 10, height: 10 } },
  target: {
    type: 'destination',
    destination: {
      pageIndex: 10,
      zoom: { mode: PdfZoomMode.FitPage },
      view: [],
    },
  },
} as PdfLinkAnnoObject

function task<T>(value: T) {
  return { toPromise: () => Promise.resolve(value) }
}

function show(onOpenChange = vi.fn()) {
  const anchor = createRef<HTMLDivElement>()
  render(
    <>
      <div ref={anchor} />
      <CitationPreview
        documentId="doc"
        link={LINK}
        anchor={anchor}
        open
        onOpenChange={onOpenChange}
      />
    </>,
  )
  return onOpenChange
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:crop')
  URL.revokeObjectURL = vi.fn()
  resolveLinkPreview.mockResolvedValue(REGION)
  renderPageRect.mockReturnValue(task(new Blob()))
})

describe('goToCoordinates', () => {
  it('stops short of the region by the toolbar’s depth, in page points', () => {
    // 124px of toolbar plus 8px of room, at 152% zoom, is ~86.8pt.
    expect(goToCoordinates(REGION, 124, 1.52).y).toBeCloseTo(336 - 132 / 1.52)
    expect(goToCoordinates(REGION, 124, 1.52).x).toBe(105)
  })

  it('never scrolls above the top of the page', () => {
    expect(
      goToCoordinates(
        { ...REGION, rect: { ...REGION.rect, origin: { x: 0, y: 20 } } },
        124,
        1,
      ).y,
    ).toBe(0)
  })
})

describe('CitationPreview', () => {
  it('shows the crop of the region, drawn at the reading zoom', async () => {
    show()

    const crop = await screen.findByRole('img', { name: /page 11/ })
    expect(crop.getAttribute('src')).toBe('blob:crop')
    // 402pt at the stubbed 150% zoom.
    expect(crop.getAttribute('width')).toBe(String(Math.round(402 * 1.5)))
    expect(renderPageRect).toHaveBeenCalledWith(
      expect.objectContaining({ pageIndex: 10, rect: REGION.rect }),
    )
  })

  it('looks the shown region up in the open paper’s references', async () => {
    // The answer is held, not drawn: a preview of a paper in the collection
    // still shows the crop and "go to" and nothing else until task 3.
    usePreviewedReference.mockReturnValue({
      id: 'edge',
      entryRegions: null,
      citedArticle: { id: 'article', title: 'Deep Contextualized Word' },
    })
    show()

    await screen.findByRole('img', { name: /page 11/ })
    expect(usePreviewedReference).toHaveBeenCalledWith('doc', REGION)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByText(/Deep Contextualized/)).toBeNull()
  })

  it('scrolls to the region clear of the toolbar, and closes, on "go to"', async () => {
    const user = userEvent.setup()
    const onOpenChange = show()

    await user.click(await screen.findByRole('button', { name: 'go to p. 11' }))

    expect(scrollToPage).toHaveBeenCalledWith({
      pageNumber: 11,
      pageCoordinates: goToCoordinates(REGION, 0, 1.5),
      behavior: 'smooth',
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('says so when a link points nowhere in the paper', async () => {
    resolveLinkPreview.mockResolvedValue(null)
    show()

    expect(
      await screen.findByText('this link points outside the paper.'),
    ).toBeTruthy()
    expect(renderPageRect).not.toHaveBeenCalled()
  })

  it('says so when the preview cannot be drawn', async () => {
    renderPageRect.mockReturnValue({
      toPromise: () => Promise.reject(new Error('render failed')),
    })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    show()

    expect(
      await screen.findByText('could not show where this link points.'),
    ).toBeTruthy()
    logged.mockRestore()
  })

  it('releases the drawn crop when it closes', async () => {
    const anchor = createRef<HTMLDivElement>()
    const { rerender } = render(
      <CitationPreview
        documentId="doc"
        link={LINK}
        anchor={anchor}
        open
        onOpenChange={vi.fn()}
      />,
    )
    await screen.findByRole('img', { name: /page 11/ })

    rerender(
      <CitationPreview
        documentId="doc"
        link={LINK}
        anchor={anchor}
        open={false}
        onOpenChange={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:crop'),
    )
  })
})
