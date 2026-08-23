import { describe, expect, it } from 'vitest'
import {
  HOLD_DURATION_MS,
  HOLD_MOVEMENT_TOLERANCE_PX,
  hasWandered,
  isHold,
} from './hold'

/**
 * Which press is a hold, and which is a scroll on its way somewhere.
 *
 * The two failure directions are not symmetrical, which is why both are tested
 * at their boundary: too eager and a deliberate scroll selects text — the defect
 * this whole feature exists to remove — while too shy only means a reader holds
 * a moment longer.
 */

const AT = (x: number, y: number) => ({ x, y })
const STILL = { from: AT(200, 300), to: AT(200, 300) }

describe('isHold', () => {
  it('is a hold once the finger has rested long enough', () => {
    expect(isHold({ heldForMs: HOLD_DURATION_MS, ...STILL })).toBe(true)
  })

  it('is not a hold before then', () => {
    expect(isHold({ heldForMs: HOLD_DURATION_MS - 1, ...STILL })).toBe(false)
  })

  it('is not a hold when the finger wandered, however long it stayed', () => {
    // A press that travels is a scroll. Time does not redeem it — this is the
    // case that keeps a slow drag down the page from selecting a word at the
    // end of it.
    expect(
      isHold({
        heldForMs: HOLD_DURATION_MS * 10,
        from: AT(200, 300),
        to: AT(200, 400),
      }),
    ).toBe(false)
  })

  it('forgives the drift a thumb cannot help', () => {
    expect(
      isHold({
        heldForMs: HOLD_DURATION_MS,
        from: AT(200, 300),
        to: AT(200, 300 + HOLD_MOVEMENT_TOLERANCE_PX),
      }),
    ).toBe(true)
  })
})

describe('hasWandered', () => {
  it('treats travel exactly at the tolerance as still', () => {
    expect(hasWandered(AT(0, 0), AT(HOLD_MOVEMENT_TOLERANCE_PX, 0))).toBe(false)
  })

  it('treats travel just past it as movement', () => {
    expect(
      hasWandered(AT(0, 0), AT(HOLD_MOVEMENT_TOLERANCE_PX + 0.01, 0)),
    ).toBe(true)
  })

  it('measures the distance, not either axis', () => {
    // 6-8-10: inside the tolerance on both axes, exactly on it in fact. Judging
    // per axis would forgive a diagonal drift of 14px as if it were 10.
    expect(hasWandered(AT(0, 0), AT(6, 8))).toBe(false)
    expect(hasWandered(AT(0, 0), AT(8, 8))).toBe(true)
  })
})

describe('the thresholds themselves', () => {
  it('waits as long as a phone does', () => {
    /*
     * Pinned because the number is a decision, not an implementation detail:
     * 500ms is Android's long-press timeout and roughly Chrome's own wait
     * before a context menu. Drifting off it would make the reader's gesture
     * fire at a different moment from every other long press on the device —
     * which reads as the gesture being unreliable rather than different.
     */
    expect(HOLD_DURATION_MS).toBe(500)
  })

  it('forgives about as much drift as a thumb produces', () => {
    expect(HOLD_MOVEMENT_TOLERANCE_PX).toBe(10)
  })
})
