import { describe, expect, it } from 'vitest'
import { parseRegion } from './regions'

/**
 * Reading GROBID's `coords`. The values here are taken from a real run against
 * RoBERTa on the local stack, not invented: an entry is several boxes, one per
 * printed line, and the page is one-based.
 */

/** Reference [1] of RoBERTa, four lines on page 10. */
const FOUR_LINE_ENTRY =
  '10,72.00,417.33,218.36,8.91;10,82.92,428.37,207.42,8.91;' +
  '10,82.92,439.37,207.64,8.72;10,82.92,450.29,67.77,8.72'

describe('parseRegion', () => {
  it('reads every line of an entry, on a zero-based page', () => {
    const region = parseRegion(FOUR_LINE_ENTRY)

    // GROBID counts pages from 1; everything downstream — the preview, the
    // engine — counts from 0.
    expect(region?.pageIndex).toBe(9)
    expect(region?.boxes).toHaveLength(4)
    expect(region?.boxes[0]).toEqual({
      x: 72,
      y: 417.33,
      width: 218.36,
      height: 8.91,
    })
    expect(region?.boxes[3]).toEqual({
      x: 82.92,
      y: 450.29,
      width: 67.77,
      height: 8.72,
    })
  })

  it('has nothing to say about an entry GROBID did not locate', () => {
    // Not a failure: a paper read before coordinates were asked for, or one
    // whose reference list GROBID could not place, is written as it always was.
    expect(parseRegion(undefined)).toBeNull()
    expect(parseRegion('')).toBeNull()
  })

  it('ignores a box that is not five numbers', () => {
    expect(parseRegion('10,72.00,417.33')).toBeNull()
    expect(
      parseRegion('10,72.00,417.33,218.36,8.91;nonsense')?.boxes,
    ).toHaveLength(1)
  })

  it('ignores a box with no area, and a page before the first', () => {
    expect(parseRegion('10,72,417,0,8.91')).toBeNull()
    expect(parseRegion('0,72,417,218,8.91')).toBeNull()
  })

  it('keeps the first page of an entry that runs over a page break', () => {
    // A region names one page, because the preview it will be matched against
    // shows one page. The tail of a straddling entry is dropped rather than
    // turned into a region that could match neither page cleanly.
    const region = parseRegion('10,72,700,218,8.91;11,72,72,218,8.91')

    expect(region?.pageIndex).toBe(9)
    expect(region?.boxes).toHaveLength(1)
  })
})
