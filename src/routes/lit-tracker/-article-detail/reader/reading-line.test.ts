import type { PageVisibilityMetrics } from '@embedpdf/plugin-scroll'
import { describe, expect, it } from 'vitest'
import { lastPageOf, lineFromMetrics, linePosition } from './reading-line'

/**
 * A page as the scroller reports one: its visible part starts `viewportY`
 * pixels into the viewport and `pageY` points into the page, at `scale`.
 */
function page(
  pageNumber: number,
  viewportY: number,
  pageY: number,
  visibleHeight: number,
  scale = 2,
): PageVisibilityMetrics {
  return {
    pageNumber,
    viewportX: 0,
    viewportY,
    visiblePercentage: 50,
    original: {
      pageX: 0,
      pageY,
      visibleWidth: 612,
      visibleHeight,
      scale: 1,
    },
    scaled: {
      pageX: 0,
      pageY: pageY * scale,
      visibleWidth: 612 * scale,
      visibleHeight: visibleHeight * scale,
      scale,
    },
  }
}

describe('lineFromMetrics', () => {
  it('finds the point on the page the line crosses', () => {
    // Page 3 is scrolled 100pt in; the line is 60px down, past a 10px gap.
    const line = lineFromMetrics([page(3, 0, 100, 692)], 60, 10)
    expect(line).toEqual({ pageIndex: 2, top: 100 + 50 / 2 })
  })

  it('takes the lower page once the line has crossed into it', () => {
    const metrics = [page(4, 300, 0, 400), page(3, 0, 642, 150)]
    expect(lineFromMetrics(metrics, 400, 0)).toEqual({
      pageIndex: 3,
      top: 50,
    })
  })

  // Between pages, the section at the top of the next page is not yet in view.
  it('puts a line in the gap at the bottom of the page above', () => {
    const metrics = [page(3, 0, 642, 150), page(4, 310, 0, 400)]
    expect(lineFromMetrics(metrics, 305, 0)).toEqual({
      pageIndex: 2,
      top: 792,
    })
  })

  it('uses the first page when the line is above every page', () => {
    expect(lineFromMetrics([page(1, 40, 0, 300)], 20, 0)).toEqual({
      pageIndex: 0,
      top: 0,
    })
  })

  it('has nothing to say without pages', () => {
    expect(lineFromMetrics([], 60, 10)).toBeNull()
    expect(lineFromMetrics([page(1, 0, 0, 300, 0)], 60, 10)).toBeNull()
  })
})

describe('linePosition', () => {
  const LAST = { pageNumber: 9, height: 792 }

  it('is the jump’s landing while the end of the paper is not on screen', () => {
    expect(linePosition([page(4, 0, 100, 400)], LAST, 800, 64)).toBe(64)
    // The last page in view, but not yet its bottom.
    expect(linePosition([page(9, 0, 100, 400)], LAST, 800, 64)).toBe(64)
  })

  // The last screenful never reaches the top, so its headings could never be
  // marked — chosen, they would mark the section before.
  it('drops to the panel’s bottom once the last page’s bottom is in view', () => {
    expect(linePosition([page(9, 0, 380, 412)], LAST, 800, 64)).toBe(800)
  })

  it('is the landing before the document has loaded', () => {
    expect(linePosition([page(9, 0, 380, 412)], null, 800, 64)).toBe(64)
  })
})

describe('lastPageOf', () => {
  it('is the last page’s number and height', () => {
    expect(
      lastPageOf({
        pages: [{ size: { height: 792 } }, { size: { height: 842 } }],
      }),
    ).toEqual({ pageNumber: 2, height: 842 })
  })

  it('is nothing without a document', () => {
    expect(lastPageOf(null)).toBeNull()
    expect(lastPageOf({ pages: [] })).toBeNull()
  })
})
