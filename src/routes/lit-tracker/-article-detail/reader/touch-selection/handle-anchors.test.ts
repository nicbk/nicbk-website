import { describe, expect, it } from 'vitest'
import { handleAnchors } from './handle-anchors'
import {
  GLYPH_WIDTH,
  geometryFrom,
  LINE_HEIGHT,
} from './test-support/page-geometry'

/**
 * Where the handles land, over a page whose glyph boxes are known exactly.
 *
 * The assertion that matters is the same one in every case: a handle is placed
 * at a *boundary* — the outer edge of the glyph at each end — rather than at the
 * glyph's centre or at the selection's bounding box. Placed at a centre, a
 * handle covers half a character; placed on the bounding box, it drifts to the
 * page margin the moment a selection spans two lines.
 */

const PAGE = geometryFrom([
  { text: 'attention is all', y: 0 },
  { text: 'you need more', y: LINE_HEIGHT },
])

const rangeOn = (page: number, from: number, to: number) => ({
  start: { page, index: from },
  end: { page, index: to },
})

describe('handleAnchors', () => {
  it('puts each handle on the outer edge of the glyph it bounds', () => {
    // "is", the tenth and eleventh characters of the first line.
    const { start, end } = handleAnchors(PAGE, rangeOn(0, 10, 11), 0)

    expect(start).toEqual({
      x: 10 * GLYPH_WIDTH,
      top: 0,
      bottom: LINE_HEIGHT,
    })
    expect(end).toEqual({
      x: 12 * GLYPH_WIDTH,
      top: 0,
      bottom: LINE_HEIGHT,
    })
  })

  it('follows the selection onto a second line', () => {
    // From "all" on line one to "you" on line two: the two handles belong to
    // different lines, and each takes its own line's height.
    const { start, end } = handleAnchors(PAGE, rangeOn(0, 13, 19), 0)

    expect(start?.top).toBe(0)
    expect(start?.bottom).toBe(LINE_HEIGHT)
    expect(end?.top).toBe(LINE_HEIGHT)
    expect(end?.bottom).toBe(LINE_HEIGHT * 2)
  })

  it('places nothing for a selection that belongs to another page', () => {
    // Pages are virtualized, so every mounted page is asked about every
    // selection. Only the pages the range touches may answer.
    expect(handleAnchors(PAGE, rangeOn(3, 10, 11), 0)).toEqual({
      start: null,
      end: null,
    })
  })

  it('answers each end separately', () => {
    /*
     * The shape that makes crossing a page break an extension rather than a
     * rewrite: a range starting on this page and ending on the next places a
     * start handle here and nothing else.
     */
    const anchors = handleAnchors(
      PAGE,
      { start: { page: 0, index: 13 }, end: { page: 1, index: 4 } },
      0,
    )

    expect(anchors.start).not.toBeNull()
    expect(anchors.end).toBeNull()
  })

  it('draws no handle for a glyph the page cannot place', () => {
    // A stale index — geometry is cached per page and evicted under pressure,
    // so a range can outlive the glyphs it named. Not drawing is better than
    // drawing at the page's corner.
    expect(handleAnchors(PAGE, rangeOn(0, 900, 901), 0)).toEqual({
      start: null,
      end: null,
    })
  })
})
