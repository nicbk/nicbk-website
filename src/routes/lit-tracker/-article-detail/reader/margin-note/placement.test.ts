import type { Rect } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import { MARGIN_BOX_HEIGHT, MARGIN_BOX_WIDTH } from '../margin-text-box'
import {
  MARGIN_INSET,
  NARROWEST_NOTE,
  overlaps,
  placeMarginNote,
} from './placement'

const LETTER = { width: 612, height: 792 }
/** A NeurIPS-style single column: 108pt margins (#24's measurement). */
const WIDE = { left: 108, right: 504 }
/** An ACM two-column page: 54pt and 56pt (measured on TraceMonkey). */
const ACM = { left: 54, right: 556 }

function rect(x: number, y: number, width: number, height: number): Rect {
  return { origin: { x, y }, size: { width, height } }
}

/** A passage on the left half of the block, one line, at `y`. */
const leftPassage = (y = 300) => rect(120, y, 150, 10)
const rightPassage = (y = 300) => rect(400, y, 100, 10)

describe('placeMarginNote', () => {
  it('puts the note in the nearer margin, against the text, level with the passage', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(),
      obstacles: [],
    })
    expect(placement).toEqual({
      placed: true,
      side: 'left',
      rect: rect(
        WIDE.left - MARGIN_INSET - MARGIN_BOX_WIDTH,
        300,
        MARGIN_BOX_WIDTH,
        MARGIN_BOX_HEIGHT,
      ),
    })
  })

  it('writes in the right margin for a passage right of centre', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: rightPassage(),
      obstacles: [],
    })
    expect(placement.placed && placement.side).toBe('right')
    expect(placement.placed && placement.rect.origin.x).toBe(
      WIDE.right + MARGIN_INSET,
    )
  })

  // An ACM margin is narrower than #24's 72pt note: the note takes its width.
  it('narrows the note to fit a narrow margin', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: ACM,
      passage: rect(60, 300, 150, 10),
      obstacles: [],
    })
    expect(placement.placed && placement.rect.size.width).toBe(
      ACM.left - 2 * MARGIN_INSET,
    )
    expect(placement.placed && placement.rect.origin.x).toBe(MARGIN_INSET)
  })

  it('refuses a margin too narrow to write in', () => {
    const narrowest = NARROWEST_NOTE + 2 * MARGIN_INSET
    const placement = placeMarginNote({
      page: LETTER,
      block: { left: narrowest - 1, right: 500 },
      passage: rect(60, 300, 100, 10),
      obstacles: [],
    })
    expect(placement).toEqual({ placed: false, reason: 'too-narrow' })
  })

  it('accepts a margin exactly wide enough', () => {
    const narrowest = NARROWEST_NOTE + 2 * MARGIN_INSET
    const placement = placeMarginNote({
      page: LETTER,
      block: { left: narrowest, right: 500 },
      passage: rect(60, 300, 100, 10),
      obstacles: [],
    })
    expect(placement.placed).toBe(true)
  })

  it('refuses rather than overlap anything already in the way', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(300),
      obstacles: [rect(40, 320, 50, 10)],
    })
    expect(placement).toEqual({ placed: false, reason: 'no-room' })
  })

  // Never the far margin: a note there would not read as the passage's.
  it('does not fall back to the other margin', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(300),
      obstacles: [rect(0, 290, 108, 60)],
    })
    expect(placement.placed).toBe(false)
  })

  it('ignores what is elsewhere on the page', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(300),
      obstacles: [rect(40, 500, 50, 10), rect(200, 300, 100, 10)],
    })
    expect(placement.placed).toBe(true)
  })

  it('ends the note at the foot of the page rather than below it', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(780),
      obstacles: [],
    })
    expect(placement.placed && placement.rect.origin.y).toBe(
      LETTER.height - MARGIN_INSET - MARGIN_BOX_HEIGHT,
    )
  })
})

describe('overlaps', () => {
  it('counts shared area and not shared edges', () => {
    expect(overlaps(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true)
    expect(overlaps(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(false)
    expect(overlaps(rect(0, 0, 10, 10), rect(0, 10, 10, 10))).toBe(false)
  })
})
