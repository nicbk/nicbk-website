import { describe, expect, it } from 'vitest'
import { CLICK_MOVEMENT_THRESHOLD, isPuttingAMarkDown } from './click-away'

/**
 * Which press is spent on deselecting, and which still creates.
 *
 * Both halves matter equally and fail in opposite directions: too eager and
 * click-to-place stops working, too shy and the reported defect is back. The
 * boundary between them is a distance, so it is tested at the boundary rather
 * than near it.
 */

const AT = (x: number, y: number) => ({ x, y })

describe('isPuttingAMarkDown', () => {
  it('spends a click that follows a selection on deselecting', () => {
    // The reported defect: with a tool still live, this press would otherwise
    // deselect *and* stamp a new mark.
    expect(
      isPuttingAMarkDown({
        wasSelected: true,
        from: AT(100, 100),
        to: AT(100, 100),
      }),
    ).toBe(true)
  })

  it('leaves a click alone when nothing was selected', () => {
    // Click-to-place, which is a wanted behaviour and not what this removes.
    expect(
      isPuttingAMarkDown({
        wasSelected: false,
        from: AT(100, 100),
        to: AT(100, 100),
      }),
    ).toBe(false)
  })

  it('leaves a drag alone even when something was selected', () => {
    // Nobody drags a rectangle by mistake, so a drag out of bare paper is
    // unambiguous and still creates.
    expect(
      isPuttingAMarkDown({
        wasSelected: true,
        from: AT(100, 100),
        to: AT(180, 140),
      }),
    ).toBe(false)
  })

  it('treats a press exactly at the threshold as a click', () => {
    // Inclusive, matching the engine's `distance > threshold` test for having
    // moved — the two must agree about the boundary itself, not just about
    // either side of it.
    expect(
      isPuttingAMarkDown({
        wasSelected: true,
        from: AT(0, 0),
        to: AT(CLICK_MOVEMENT_THRESHOLD, 0),
      }),
    ).toBe(true)
  })

  it('treats a press just past the threshold as a drag', () => {
    expect(
      isPuttingAMarkDown({
        wasSelected: true,
        from: AT(0, 0),
        to: AT(CLICK_MOVEMENT_THRESHOLD + 0.01, 0),
      }),
    ).toBe(false)
  })

  it('measures the distance, not either axis', () => {
    // 3-4-5: under the threshold on both axes, over it in fact. Measuring per
    // axis would call this a click and let a small drag be swallowed.
    expect(
      isPuttingAMarkDown({ wasSelected: true, from: AT(0, 0), to: AT(3, 4) }),
    ).toBe(true)
    expect(
      isPuttingAMarkDown({ wasSelected: true, from: AT(0, 0), to: AT(4, 4) }),
    ).toBe(false)
  })

  it('agrees with the threshold the engine’s own click detector uses', () => {
    /*
     * The coupling that would fail silently. EmbedPDF's `useClickDetector` is
     * built with `threshold = 5`, and this pre-empts it: a press the engine
     * would call a click while this called it a drag creates a mark the reader
     * did not ask for — the defect again, in a narrow band of distances.
     *
     * The plugin does not export the number, so it is pinned here rather than
     * imported. If a future version changes it, this is the test that says so.
     */
    expect(CLICK_MOVEMENT_THRESHOLD).toBe(5)
  })
})
