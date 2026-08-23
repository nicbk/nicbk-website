import { describe, expect, it } from 'vitest'
import {
  centreOfGlyph,
  GLYPH_WIDTH,
  geometryFrom,
  LINE_HEIGHT,
} from './test-support/page-geometry'
import { wordAt } from './word-at'

/**
 * What a hold selects, over a page whose text is known exactly.
 *
 * The interesting cases are all the ones that are not "the finger landed in the
 * middle of a word": the gaps, the margins, and the page with nothing on it.
 * Those are where a selection model either behaves like the platform's or
 * surprises the reader.
 */

const PAGE = geometryFrom([
  { text: 'attention is all', y: 0 },
  { text: 'you need more', y: LINE_HEIGHT },
])

/**
 * Indices into the fixture above, named so the assertions read as words.
 *
 * Line one occupies 0–15 and the line break that follows it is 16, so the
 * second line begins at 17.
 */
const ATTENTION = { from: 0, to: 8 }
const IS = { from: 10, to: 11 }
const ALL = { from: 13, to: 15 }
const NEED = { from: 21, to: 24 }

describe('wordAt', () => {
  it('takes the whole word the finger landed in', () => {
    const range = wordAt(PAGE, centreOfGlyph(PAGE, 4), 0)

    expect(range).toEqual({
      start: { page: 0, index: ATTENTION.from },
      end: { page: 0, index: ATTENTION.to },
    })
  })

  it('takes a word on any line, and numbers it continuously', () => {
    // Character indices run across lines rather than restarting, which is how
    // the engine numbers them and why a second line is worth asserting.
    const range = wordAt(PAGE, centreOfGlyph(PAGE, 22), 0)

    expect(range).toEqual({
      start: { page: 0, index: NEED.from },
      end: { page: 0, index: NEED.to },
    })
  })

  it('carries the page it was told, not one it inferred', () => {
    const range = wordAt(PAGE, centreOfGlyph(PAGE, 4), 7)

    expect(range?.start.page).toBe(7)
    expect(range?.end.page).toBe(7)
  })

  it('takes both neighbours when the finger lands in the gap between words', () => {
    /*
     * The space itself is a glyph, and expanding from it walks outward in both
     * directions until it meets a *different* boundary — so a press between two
     * words selects both of them and the space between.
     *
     * Recorded here because it is easy to read as a bug and is not: it is
     * exactly what the library's own double-click does, and a hold that
     * behaved differently would give the reader two word-selection rules. The
     * handles are how a reader trims it to one word.
     */
    const range = wordAt(PAGE, centreOfGlyph(PAGE, 9), 0)

    expect(range).toEqual({
      start: { page: 0, index: ATTENTION.from },
      end: { page: 0, index: IS.to },
    })
  })

  it('reaches back to the last word when the finger falls off the end of a line', () => {
    // Within the hit-test tolerance, which is about one and a half line
    // heights: a thumb aimed at the end of a line often lands past it.
    const justPastTheLine = {
      x: 'attention is all'.length * GLYPH_WIDTH + GLYPH_WIDTH / 2,
      y: LINE_HEIGHT / 2,
    }

    const range = wordAt(PAGE, justPastTheLine, 0)

    expect(range).toEqual({
      start: { page: 0, index: ALL.from },
      end: { page: 0, index: ALL.to },
    })
  })

  it('selects nothing when the finger is nowhere near text', () => {
    // A margin, a figure, the white space below the last line — all ordinary
    // places to hold, and none of them should drag in the nearest word from
    // across the page.
    const range = wordAt(PAGE, { x: 400, y: 600 }, 0)

    expect(range).toBeNull()
  })

  it('selects nothing on a page with no text at all', () => {
    // A scanned page: it renders, it can be annotated, and it has no glyphs.
    expect(wordAt({ runs: [] }, { x: 10, y: 10 }, 0)).toBeNull()
  })
})
