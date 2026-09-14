import type {
  PdfDocumentObject,
  PdfGlyphObject,
  PdfLinkAnnoObject,
  PdfTextRun,
} from '@embedpdf/models'
import {
  PdfActionType,
  PdfAnnotationSubtype,
  PdfZoomMode,
} from '@embedpdf/models'
import type { TrackedAnnotation } from '@embedpdf/plugin-annotation'
import { describe, expect, it, vi } from 'vitest'
import {
  destinationOf,
  landingsFrom,
  linkText,
  resolveLinkPreview,
} from './link-preview-source'

/**
 * Gathering a preview from the open document, with the engine faked.
 *
 * The decisions are `link-preview-region.test.ts`'s. What is asserted here is the
 * reading: the right characters for the link, only the pages that matter, and
 * each page once.
 */

const HEIGHT = 792

function doc(pageCount: number): PdfDocumentObject {
  return {
    id: 'doc',
    pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      index,
      size: { width: 612, height: HEIGHT },
      rotation: 0,
    })),
  } as unknown as PdfDocumentObject
}

/** A task-shaped value: what the engine's methods return. */
function task<T>(value: T) {
  return { toPromise: () => Promise.resolve(value) }
}

function glyph(x: number, y: number): PdfGlyphObject {
  return {
    origin: { x, y },
    size: { width: 5, height: 10 },
  } as PdfGlyphObject
}

function run(x: number, y: number, text: string): PdfTextRun {
  return {
    text,
    rect: { origin: { x, y }, size: { width: 300, height: 10 } },
  } as PdfTextRun
}

function citation(pageIndex: number, top: number): PdfLinkAnnoObject {
  return {
    id: `link-${pageIndex}-${top}`,
    type: PdfAnnotationSubtype.LINK,
    pageIndex: 1,
    rect: { origin: { x: 100, y: 200 }, size: { width: 12, height: 10 } },
    target: {
      type: 'destination',
      destination: {
        pageIndex,
        zoom: {
          mode: PdfZoomMode.XYZ,
          params: { x: 108, y: HEIGHT - top, zoom: 0 },
        },
        view: [],
      },
    },
  } as PdfLinkAnnoObject
}

function tracked(object: unknown): TrackedAnnotation {
  return { object, commitState: 'synced' } as unknown as TrackedAnnotation
}

describe('destinationOf', () => {
  it('reads a destination, and a go-to action’s', () => {
    const link = citation(4, 100)
    expect(destinationOf(link.target)?.pageIndex).toBe(4)
    expect(
      destinationOf({
        type: 'action',
        action: {
          type: PdfActionType.Goto,
          destination: {
            pageIndex: 6,
            zoom: { mode: PdfZoomMode.FitPage },
            view: [],
          },
        },
      })?.pageIndex,
    ).toBe(6)
  })

  it('has none for a URL or no target', () => {
    expect(
      destinationOf({
        type: 'action',
        action: { type: PdfActionType.URI, uri: 'https://x' },
      }),
    ).toBeNull()
    expect(destinationOf(undefined)).toBeNull()
  })
})

describe('landingsFrom', () => {
  it('keeps positioned internal links, and nothing else', () => {
    const landings = landingsFrom(
      [
        tracked(citation(3, 120)),
        tracked({
          ...citation(3, 0),
          target: {
            type: 'destination',
            destination: {
              pageIndex: 3,
              zoom: { mode: PdfZoomMode.FitPage },
              view: [],
            },
          },
        }),
        tracked({ type: PdfAnnotationSubtype.HIGHLIGHT, pageIndex: 1 }),
        tracked(citation(99, 50)),
      ],
      doc(10),
    )

    expect(landings).toEqual([{ pageIndex: 3, x: 108, y: 120 }])
  })
})

describe('linkText', () => {
  it('reads only the characters whose glyphs sit inside the link', async () => {
    // "memory [13] and": the link's box covers the glyphs at 100 and 106 only.
    const getTextSlices = vi.fn(() => task(['13']))
    const engine = {
      getPageGlyphs: () =>
        task([
          glyph(60, 200),
          glyph(94, 200),
          glyph(100, 200),
          glyph(106, 200),
          glyph(113, 200),
        ]),
      getPageTextRuns: vi.fn(),
      getTextSlices,
    }

    const text = await linkText(engine as never, doc(3), citation(2, 100))

    expect(text).toBe('13')
    expect(getTextSlices).toHaveBeenCalledWith(expect.anything(), [
      { pageIndex: 1, charIndex: 2, charCount: 2 },
    ])
  })

  it('skips the holes the engine leaves for characters with no box', async () => {
    const engine = {
      getPageGlyphs: () =>
        task([undefined, glyph(100, 200)] as unknown as PdfGlyphObject[]),
      getPageTextRuns: vi.fn(),
      getTextSlices: () => task(['1']),
    }

    await expect(
      linkText(engine as never, doc(3), citation(2, 100)),
    ).resolves.toBe('1')
  })

  it('is empty when no glyph is inside the link', async () => {
    const getTextSlices = vi.fn()
    const engine = {
      getPageGlyphs: () => task([glyph(400, 400)]),
      getPageTextRuns: vi.fn(),
      getTextSlices,
    }

    await expect(
      linkText(engine as never, doc(3), citation(2, 100)),
    ).resolves.toBe('')
    expect(getTextSlices).not.toHaveBeenCalled()
  })
})

describe('resolveLinkPreview', () => {
  function engineWith(runsByPage: Record<number, PdfTextRun[]>) {
    return {
      getPageGlyphs: () => task([glyph(100, 200), glyph(106, 200)]),
      getTextSlices: () => task(['13']),
      getPageTextRuns: vi.fn((_: PdfDocumentObject, page: { index: number }) =>
        task({ runs: runsByPage[page.index] ?? [] }),
      ),
    }
  }

  it('resolves the region from the target page’s text', async () => {
    const engine = engineWith({ 10: [run(108, 339, '[13] Author. Title.')] })

    const region = await resolveLinkPreview({
      engine: engine as never,
      document: doc(15),
      link: citation(10, 339),
      annotations: [],
    })

    expect(region?.pageIndex).toBe(10)
    expect(region?.rect.origin.y).toBe(336)
  })

  it('reads the target page and its two neighbours, and no other', async () => {
    const engine = engineWith({})

    await resolveLinkPreview({
      engine: engine as never,
      document: doc(15),
      link: citation(10, 339),
      annotations: [],
    })

    const pagesRead = engine.getPageTextRuns.mock.calls.map(
      ([, page]) => page.index,
    )
    expect(pagesRead.sort()).toEqual([10, 11, 9])
  })

  it('does not read a page twice for the same document', async () => {
    const document = doc(15)
    const engine = engineWith({})

    await resolveLinkPreview({
      engine: engine as never,
      document,
      link: citation(5, 100),
      annotations: [],
    })
    await resolveLinkPreview({
      engine: engine as never,
      document,
      link: citation(5, 300),
      annotations: [],
    })

    expect(engine.getPageTextRuns).toHaveBeenCalledTimes(3)
  })

  it('previews nothing for a link without a destination', async () => {
    const engine = engineWith({})

    await expect(
      resolveLinkPreview({
        engine: engine as never,
        document: doc(3),
        link: { ...citation(1, 1), target: undefined },
        annotations: [],
      }),
    ).resolves.toBeNull()
    expect(engine.getPageTextRuns).not.toHaveBeenCalled()
  })
})
