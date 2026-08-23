import { describe, expect, it } from 'vitest'
import type { PanelBounds } from '../magnifier-view'
import {
  AUTO_SCROLL_BAND,
  AUTO_SCROLL_CEILING,
  autoScrollRate,
  nextScrollOffset,
} from './auto-scroll'

/**
 * The curve, at the points where it was argued about: the edge of the dead
 * band, the middle of it, the panel's edge, and past it.
 *
 * The numbers here are the decision, not an implementation detail — a linear
 * ramp would pass every test about direction and bounds and still be wrong, so
 * the shape itself is asserted.
 */

const PANEL: PanelBounds = { left: 0, top: 100, right: 400, bottom: 700 }

/** Where a finger `into` pixels into the bottom band sits. */
function fromBottom(into: number): number {
  return PANEL.bottom - AUTO_SCROLL_BAND + into
}

describe('autoScrollRate', () => {
  it('leaves the paper alone in the middle of the panel', () => {
    expect(autoScrollRate(400, PANEL)).toBe(0)
  })

  it('does nothing at all until the finger is inside the band', () => {
    // The commonest position by far: a reader adjusting a boundary near the
    // bottom of the screen is not asking to scroll.
    expect(autoScrollRate(fromBottom(0), PANEL)).toBe(0)
    expect(autoScrollRate(fromBottom(-1), PANEL)).toBe(0)
  })

  it('crawls at the near edge of the band, at reading speed', () => {
    // A quarter of the way in: about one line of body text every quarter
    // second, which is the case that decided the curve.
    const rate = autoScrollRate(fromBottom(AUTO_SCROLL_BAND / 4), PANEL)

    expect(rate).toBeGreaterThan(0)
    expect(rate).toBeLessThan(100)
  })

  it('is squared, not linear — which is the whole decision', () => {
    /*
     * Half way into the band a straight ramp would be at half the ceiling. The
     * square puts it at a quarter, which is what keeps the near two-thirds of
     * the band usable for a two-line adjustment.
     */
    const halfway = autoScrollRate(fromBottom(AUTO_SCROLL_BAND / 2), PANEL)

    expect(halfway).toBeCloseTo(AUTO_SCROLL_CEILING / 4)
    expect(halfway).toBeLessThan(AUTO_SCROLL_CEILING / 2)
  })

  it('reaches its ceiling at the panel edge and climbs no further', () => {
    // A finger can leave the panel entirely — the browser keeps reporting it —
    // and the paper must not run away with the drag.
    expect(autoScrollRate(PANEL.bottom, PANEL)).toBeCloseTo(AUTO_SCROLL_CEILING)
    expect(autoScrollRate(PANEL.bottom + 500, PANEL)).toBeCloseTo(
      AUTO_SCROLL_CEILING,
    )
  })

  it('scrolls the other way at the top, by sign', () => {
    // Negative because it is added to a scroll offset, where less is earlier.
    expect(autoScrollRate(PANEL.top, PANEL)).toBeCloseTo(-AUTO_SCROLL_CEILING)
    expect(autoScrollRate(PANEL.top - 200, PANEL)).toBeCloseTo(
      -AUTO_SCROLL_CEILING,
    )
    expect(autoScrollRate(PANEL.top + AUTO_SCROLL_BAND / 2, PANEL)).toBeCloseTo(
      -AUTO_SCROLL_CEILING / 4,
    )
  })

  it('answers for a panel shorter than two bands without scrolling both ways', () => {
    // A reader in a short window, or a phone in landscape. The top wins, which
    // is arbitrary but decided: what must not happen is a rate that flips
    // between frames as the finger sits still.
    const squashed: PanelBounds = { left: 0, top: 0, right: 400, bottom: 60 }

    expect(autoScrollRate(30, squashed)).toBeLessThan(0)
  })
})

describe('nextScrollOffset', () => {
  it('moves by the rate over the time that passed', () => {
    expect(
      nextScrollOffset({ from: 100, rate: 600, elapsed: 500, furthest: 5000 }),
    ).toBe(400)
  })

  it('stops at the end of the document', () => {
    // Otherwise a finger parked at the bottom edge of the last page drives the
    // offset past the paper for as long as it stays there.
    expect(
      nextScrollOffset({
        from: 4900,
        rate: 1000,
        elapsed: 1000,
        furthest: 5000,
      }),
    ).toBe(5000)
  })

  it('stops at the beginning', () => {
    expect(
      nextScrollOffset({
        from: 20,
        rate: -1000,
        elapsed: 1000,
        furthest: 5000,
      }),
    ).toBe(0)
  })

  it('holds at zero for a document shorter than its panel', () => {
    // `scrollHeight - clientHeight` is negative before the paper is laid out,
    // and a negative ceiling would otherwise scroll the panel backwards.
    expect(
      nextScrollOffset({ from: 0, rate: 1000, elapsed: 1000, furthest: -40 }),
    ).toBe(0)
  })
})
