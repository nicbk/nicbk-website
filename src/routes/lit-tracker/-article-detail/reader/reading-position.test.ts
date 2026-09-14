import type { PageVisibilityMetrics } from '@embedpdf/plugin-scroll'
import { describe, expect, it } from 'vitest'
import {
  hasMoved,
  LINE_HEIGHT_PT,
  positionFromMetrics,
  restorablePosition,
} from './reading-position'

/**
 * Reading a position from the scroller, and deciding what to do with a stored
 * one. The numbers in the first group are the browser's: measured at 152% with
 * EmbedPDF's 10px viewport gap.
 */

function visible(
  pageNumber: number,
  viewportY: number,
  pageY: number,
  scale = 1.516,
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
      visibleHeight: 300,
      scale: 1,
    },
    scaled: {
      pageX: 0,
      pageY: pageY * scale,
      visibleWidth: 612 * scale,
      visibleHeight: 300 * scale,
      scale,
    },
  }
}

describe('positionFromMetrics', () => {
  it('reads the offset the page really sits at, less the viewport gap', () => {
    // Scrolled to 400pt of page 5: the DOM put the page at 399.86pt, and the
    // scroller reported 406.45.
    const position = positionFromMetrics([visible(5, 0, 406.45)], 10)

    expect(position?.page).toBe(5)
    expect(position?.offset).toBeCloseTo(406.45 - 10 / 1.516)
    expect(position?.offset).toBeCloseTo(399.86, 1)
  })

  it('takes the page at the top of the reader, not the most visible one', () => {
    const position = positionFromMetrics(
      [
        { ...visible(3, 0, 700), visiblePercentage: 5 },
        { ...visible(4, 90, 0), visiblePercentage: 80 },
      ],
      10,
    )

    expect(position?.page).toBe(3)
  })

  it('never reads above the top of a page', () => {
    // The top of the reader in the gap before page 4.
    expect(positionFromMetrics([visible(4, 3, 2)], 10)?.offset).toBe(0)
  })

  it('has nothing to read when no page is visible', () => {
    expect(positionFromMetrics([], 10)).toBeNull()
  })
})

describe('restorablePosition', () => {
  it('keeps a position inside the paper', () => {
    expect(restorablePosition({ page: 9, offset: 400 }, 15)).toEqual({
      page: 9,
      offset: 400,
    })
    expect(restorablePosition({ page: 15, offset: 0 }, 15)).not.toBeNull()
  })

  it('ignores a page past the end, rather than opening at the last', () => {
    expect(restorablePosition({ page: 16, offset: 0 }, 15)).toBeNull()
  })

  it('ignores nothing saved, and nonsense', () => {
    expect(restorablePosition(null, 15)).toBeNull()
    expect(restorablePosition({ page: 0, offset: 0 }, 15)).toBeNull()
    expect(restorablePosition({ page: 2.5, offset: 0 }, 15)).toBeNull()
    expect(restorablePosition({ page: 2, offset: -1 }, 15)).toBeNull()
    expect(restorablePosition({ page: 2, offset: Number.NaN }, 15)).toBeNull()
  })
})

describe('hasMoved', () => {
  const FROM = { page: 4, offset: 200 }

  it('is not moved by less than a line', () => {
    expect(hasMoved({ page: 4, offset: 200 + LINE_HEIGHT_PT }, FROM)).toBe(
      false,
    )
    expect(hasMoved({ page: 4, offset: 200 - LINE_HEIGHT_PT }, FROM)).toBe(
      false,
    )
  })

  it('is moved by more than a line, or onto another page', () => {
    expect(hasMoved({ page: 4, offset: 213 }, FROM)).toBe(true)
    expect(hasMoved({ page: 5, offset: 200 }, FROM)).toBe(true)
  })

  it('is moved from nowhere', () => {
    expect(hasMoved(FROM, null)).toBe(true)
  })
})
