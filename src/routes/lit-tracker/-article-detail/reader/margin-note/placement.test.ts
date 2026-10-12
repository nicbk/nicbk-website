import type { Rect } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import { MARGIN_BOX_HEIGHT, MARGIN_BOX_WIDTH } from '../margin-text-box'
import { REACH } from './packing'
import {
  MARGIN_INSET,
  NARROWEST_NOTE,
  packColumn,
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
      notes: [],
    })
    expect(placement).toEqual({
      placed: true,
      side: 'left',
      moves: new Map(),
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
      notes: [],
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
      notes: [],
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
      notes: [],
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
      notes: [],
    })
    expect(placement.placed).toBe(true)
  })

  // Within reach of its passage, a note steps round what is fixed.
  it('moves the note just clear of a fixed annotation in its way', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(300),
      obstacles: [rect(40, 320, 50, 10)],
      notes: [],
    })
    expect(placement.placed && placement.rect.origin.y).toBe(
      320 - MARGIN_BOX_HEIGHT,
    )
  })

  // Never the far margin, and never further than its reach.
  it('refuses when nothing within reach of the passage is free', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(300),
      obstacles: [rect(0, 290, 108, 60)],
      notes: [],
    })
    expect(placement).toEqual({ placed: false, reason: 'no-room' })
  })

  it('makes room by moving another margin note, and says how', () => {
    // A note for the line above, sitting level with its own passage.
    const neighbour = {
      id: 'n1',
      rect: rect(32, 290, 72, MARGIN_BOX_HEIGHT),
      anchor: 290,
    }
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(300),
      obstacles: [],
      notes: [neighbour],
    })
    expect(placement.placed).toBe(true)
    if (!placement.placed) return
    const moved = placement.moves.get('n1')
    // The two no longer overlap, and neither is out of reach of its passage.
    const newTop = placement.rect.origin.y
    const neighbourTop = moved ?? 290
    expect(
      newTop >= neighbourTop + MARGIN_BOX_HEIGHT ||
        neighbourTop >= newTop + MARGIN_BOX_HEIGHT,
    ).toBe(true)
    expect(Math.abs(newTop - 300)).toBeLessThanOrEqual(REACH)
    expect(Math.abs(neighbourTop - 290)).toBeLessThanOrEqual(REACH)
  })

  it('leaves a margin note in the other margin alone', () => {
    const across = {
      id: 'far',
      rect: rect(508, 300, 72, MARGIN_BOX_HEIGHT),
      anchor: 300,
    }
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(300),
      obstacles: [],
      notes: [across],
    })
    expect(placement.placed && placement.moves.size).toBe(0)
    expect(placement.placed && placement.rect.origin.y).toBe(300)
  })

  it('ignores what is elsewhere on the page', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(300),
      obstacles: [rect(40, 500, 50, 10), rect(200, 300, 100, 10)],
      notes: [],
    })
    expect(placement.placed).toBe(true)
  })

  it('ends the note at the foot of the page rather than below it', () => {
    const placement = placeMarginNote({
      page: LETTER,
      block: WIDE,
      passage: leftPassage(780),
      obstacles: [],
      notes: [],
    })
    expect(placement.placed && placement.rect.origin.y).toBe(
      LETTER.height - MARGIN_INSET - MARGIN_BOX_HEIGHT,
    )
  })
})

describe('packColumn', () => {
  const column = { left: 32, right: 104 }

  // A note that grew pushes the one below it down, within reach.
  it('moves the note below a note that grew', () => {
    const upper = { id: 'up', rect: rect(32, 300, 72, 40), anchor: 300 }
    const lower = { id: 'low', rect: rect(32, 350, 72, 40), anchor: 350 }
    const moves = packColumn({
      column,
      page: LETTER,
      obstacles: [],
      notes: [upper, lower],
      resized: { id: 'up', height: 80 },
    })
    expect(moves?.get('up')).toBeUndefined()
    expect(moves?.get('low')).toBe(300 + 80 + 4)
  })

  it('moves nothing when nothing has to move', () => {
    const only = { id: 'n', rect: rect(32, 300, 72, 40), anchor: 300 }
    expect(
      packColumn({ column, page: LETTER, obstacles: [], notes: [only] })?.size,
    ).toBe(0)
  })
})
