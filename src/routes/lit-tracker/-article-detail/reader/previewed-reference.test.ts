import { describe, expect, it } from 'vitest'
import type { EntryRegion } from '~/lit-tracker/extraction/tei/regions'
import type { PreviewRegion } from './link-preview-region'
import { previewedReference } from './previewed-reference'

/**
 * Which reference the preview is showing.
 *
 * **Every rectangle here is real.** The entries are rows of `entry_regions` read
 * out of the local collection, and `MEASURED` is the region #22 produced in the
 * browser for BERT's citation to ELMo — the pair task 1 measured against each
 * other. Invented rectangles would prove only that the arithmetic is
 * arithmetic; these prove that the two coordinate spaces meet on real papers.
 */

interface Edge {
  id: string
  entryRegions: EntryRegion | null
}

/** BERT, page 11 (index 10), left column: three entries as GROBID located them. */
const GLOVE: Edge = {
  id: 'glove',
  entryRegions: {
    pageIndex: 10,
    boxes: [
      { x: 72, y: 608.74, width: 218.27, height: 8.64 },
      { x: 82.91, y: 619.7, width: 207.36, height: 8.64 },
      { x: 82.91, y: 630.49, width: 207.36, height: 8.81 },
      { x: 82.91, y: 641.44, width: 207.36, height: 8.81 },
      { x: 82.91, y: 652.57, width: 22.42, height: 8.64 },
    ],
  },
}
const SEMI_SUPERVISED: Edge = {
  id: 'semi-supervised',
  entryRegions: {
    pageIndex: 10,
    boxes: [
      { x: 72, y: 671.65, width: 218.27, height: 8.64 },
      { x: 82.91, y: 682.61, width: 207.36, height: 8.64 },
      { x: 82.91, y: 693.57, width: 207.36, height: 8.64 },
      { x: 82.91, y: 704.36, width: 31.25, height: 8.81 },
    ],
  },
}
const ELMO: Edge = {
  id: 'elmo',
  entryRegions: {
    pageIndex: 10,
    boxes: [
      { x: 72, y: 723.6, width: 218.27, height: 8.64 },
      { x: 82.91, y: 734.56, width: 207.36, height: 8.64 },
      { x: 82.91, y: 745.52, width: 207.36, height: 8.64 },
      { x: 82.91, y: 756.31, width: 97.38, height: 8.81 },
    ],
  },
}

/**
 * The page *before* it, at nearly the same place on the page: a bibliography is
 * set the same way on every page it runs over, so a rectangle alone is
 * ambiguous across pages.
 */
const MULTI_PARAGRAPH: Edge = {
  id: 'multi-paragraph',
  entryRegions: {
    pageIndex: 9,
    boxes: [
      { x: 72, y: 734.56, width: 218.27, height: 8.64 },
      { x: 82.91, y: 745.52, width: 207.36, height: 8.64 },
      { x: 82.91, y: 756.31, width: 53.94, height: 8.81 },
    ],
  },
}

/** A reference Semantic Scholar supplied, which no bibliography was parsed for. */
const UNLOCATED: Edge = { id: 'unlocated', entryRegions: null }

/** What the reader saw: the region #22 built for the `[Peters et al.]` link. */
const MEASURED: PreviewRegion = {
  pageIndex: 10,
  rect: {
    origin: { x: 64.02, y: 716.13 },
    size: { width: 228.98, height: 48.87 },
  },
}

const BIBLIOGRAPHY = [GLOVE, SEMI_SUPERVISED, ELMO, MULTI_PARAGRAPH, UNLOCATED]

function regionOver(top: number, bottom: number): PreviewRegion {
  return {
    pageIndex: 10,
    rect: {
      origin: { x: 69, y: top },
      size: { width: 224.27, height: bottom - top },
    },
  }
}

describe('previewedReference', () => {
  it('is the reference the reader is looking at', () => {
    expect(previewedReference(MEASURED, BIBLIOGRAPHY)).toBe(ELMO)
  })

  it('is decided by the page before the rectangle', () => {
    // The same rectangle, one page earlier, is a different reference — 99.8% of
    // one there, 99.8% of ELMo here. Nothing but the page tells them apart.
    const pageBefore = { ...MEASURED, pageIndex: 9 }

    expect(previewedReference(pageBefore, BIBLIOGRAPHY)).toBe(MULTI_PARAGRAPH)
  })

  it('is nothing when the region covers two entries', () => {
    // A link landing between two references, or a list set tighter than any
    // measured. Opening the wrong paper costs the reader their place; offering
    // nothing costs them a click.
    const both = regionOver(668, 765.2)

    expect(previewedReference(both, BIBLIOGRAPHY)).toBeNull()
    // …and it is not that neither was found: each alone is a match.
    expect(previewedReference(regionOver(668, 714), BIBLIOGRAPHY)).toBe(
      SEMI_SUPERVISED,
    )
    expect(previewedReference(regionOver(716.13, 765.2), BIBLIOGRAPHY)).toBe(
      ELMO,
    )
  })

  it('is not the entry whose last line the region clips', () => {
    // Layer Normalization's worst case, real: the region for "Order-Embeddings"
    // reaches 3.22pt into the one-line entry above it, 40.6% of everything that
    // entry prints. The most an unrelated entry was covered anywhere in the
    // collection, and still well short of a match.
    const oneLineAbove: Edge = {
      id: 'natural-gradient',
      entryRegions: {
        pageIndex: 10,
        boxes: [{ x: 108, y: 360.75, width: 329.75, height: 7.94 }],
      },
    }
    const orderEmbeddings: Edge = {
      id: 'order-embeddings',
      entryRegions: {
        pageIndex: 10,
        boxes: [
          { x: 108, y: 375.94, width: 396, height: 7.77 },
          { x: 117.96, y: 385.65, width: 44.09, height: 7.94 },
        ],
      },
    }
    const region: PreviewRegion = {
      pageIndex: 10,
      rect: {
        origin: { x: 105, y: 365.47 },
        size: { width: 402, height: 28.12 },
      },
    }

    expect(previewedReference(region, [oneLineAbove, orderEmbeddings])).toBe(
      orderEmbeddings,
    )
  })

  it('is nothing for a link that is not a reference at all', () => {
    // A table, a figure, a section heading: a region elsewhere on the paper,
    // over no entry.
    const table = regionOver(200, 320)

    expect(previewedReference(table, BIBLIOGRAPHY)).toBeNull()
  })

  it('never matches a reference nothing was parsed for', () => {
    expect(previewedReference(MEASURED, [UNLOCATED])).toBeNull()
  })

  it('never matches a region with nothing printed in it', () => {
    // `entry_regions` is jsonb and arrives at the reader unchecked. An entry
    // with no boxes covers nothing, and must not come out as a match on the
    // arithmetic of an empty sum.
    const empty: Edge = {
      id: 'empty',
      entryRegions: { pageIndex: 10, boxes: [] },
    }

    expect(previewedReference(MEASURED, [empty])).toBeNull()
  })

  it('has no answer before the region does', () => {
    expect(previewedReference(null, BIBLIOGRAPHY)).toBeNull()
  })
})
