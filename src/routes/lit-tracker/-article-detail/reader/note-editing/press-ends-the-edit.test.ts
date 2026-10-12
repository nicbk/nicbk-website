import { describe, expect, it } from 'vitest'
import { HOLD_MOVEMENT_TOLERANCE_PX } from '../touch-selection/hold'
import { pressEndsTheEdit } from './press-ends-the-edit'

const HERE = { x: 100, y: 100 }
const FAR = { x: 100, y: 100 + HOLD_MOVEMENT_TOLERANCE_PX + 1 }

describe('pressEndsTheEdit', () => {
  it('ends the edit for a mouse press, wherever it went', () => {
    expect(pressEndsTheEdit({ kind: 'mouse', from: HERE, to: HERE })).toBe(true)
    // A drag elsewhere — selecting text, drawing — has left the note too.
    expect(pressEndsTheEdit({ kind: 'mouse', from: HERE, to: FAR })).toBe(true)
  })

  it('ends the edit for a pen, as for a mouse', () => {
    expect(pressEndsTheEdit({ kind: 'pen', from: HERE, to: FAR })).toBe(true)
  })

  it('ends the edit for a finger that tapped', () => {
    expect(pressEndsTheEdit({ kind: 'touch', from: HERE, to: HERE })).toBe(true)
  })

  // Scrolling the paper while typing must not drop the phone's keyboard.
  it('leaves the edit alone for a finger that travelled', () => {
    expect(pressEndsTheEdit({ kind: 'touch', from: HERE, to: FAR })).toBe(false)
  })
})
