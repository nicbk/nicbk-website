import { describe, expect, it } from 'vitest'
import type { PressToJudge } from './click-away'
import {
  CLICK_MOVEMENT_THRESHOLD,
  putsTheMarkDownOnRelease,
  withholdsThePress,
  withholdsTheRelease,
} from './click-away'

/**
 * Which press is spent on putting a mark down, and where it is stopped.
 *
 * Every case fails in one of two directions, and they are not symmetrical: too
 * eager and the reader loses a way to make a mark, too shy and they get marks
 * they did not ask for — which is the defect this whole thing exists to remove,
 * and which came back once already in a shape nobody had thought to test.
 */

const AT = (x: number, y: number) => ({ x, y })

/** A press, with the parts each test cares about spelled out. */
function press(over: Partial<PressToJudge> = {}): PressToJudge {
  return {
    kind: 'mouse',
    wasSelected: true,
    tool: 'square',
    from: AT(100, 100),
    to: AT(100, 100),
    fromOnScreen: AT(400, 300),
    toOnScreen: AT(400, 300),
    ...over,
  }
}

describe('withholdsThePress', () => {
  it('takes a finger’s press away from the tool while a mark is selected', () => {
    /*
     * The movement that would draw is the movement that scrolls, and the
     * browser decides which as the gesture begins — so there is no later moment
     * at which this could be judged. Withholding the press is what leaves the
     * gesture to the browser: the paper pans, and nothing is drawn.
     */
    expect(withholdsThePress(press({ kind: 'touch' }))).toBe(true)
  })

  it('lets a mouse press through, so a drag can still create', () => {
    expect(withholdsThePress(press())).toBe(false)
  })

  it('takes the press away from a tool that creates on the press itself', () => {
    // The sticky note commits at pointer-down. Judging its release would be
    // judging a note that already exists.
    expect(withholdsThePress(press({ tool: 'textComment' }))).toBe(true)
  })

  it('leaves every press alone when no mark is selected', () => {
    // Nothing is being put down, so nothing is being spent — this must be
    // invisible to a reader who is simply drawing.
    expect(
      withholdsThePress(press({ kind: 'touch', wasSelected: false })),
    ).toBe(false)
  })

  it('leaves a finger’s press alone when no tool is live', () => {
    // There is nothing to withhold it from, and taking it would cost the touch
    // selection its long press.
    expect(withholdsThePress(press({ kind: 'touch', tool: null }))).toBe(false)
  })
})

describe('withholdsTheRelease', () => {
  it('spends a click that follows a selection on deselecting', () => {
    // The reported defect from #114: with a tool still live, this press would
    // otherwise deselect *and* make a new mark.
    expect(withholdsTheRelease(press())).toBe(true)
  })

  it('leaves a drag alone even when something was selected', () => {
    // Nobody drags a rectangle by mistake, so a drag out of bare paper is
    // unambiguous and still creates.
    expect(withholdsTheRelease(press({ to: AT(180, 140) }))).toBe(false)
  })

  it('leaves a click alone when nothing was selected', () => {
    expect(withholdsTheRelease(press({ wasSelected: false }))).toBe(false)
  })

  it('does not judge a release the tool never heard begin', () => {
    // A finger's press, and a sticky note's, were taken at the start. There is
    // no half-made mark to stop, and saying otherwise would send the tool a
    // cancel for a gesture it knows nothing about.
    expect(withholdsTheRelease(press({ kind: 'touch' }))).toBe(false)
    expect(withholdsTheRelease(press({ tool: 'textComment' }))).toBe(false)
  })

  it('treats a press exactly at the threshold as a click', () => {
    // Inclusive, matching the engine's `distance > threshold` test for having
    // moved — the two must agree about the boundary itself, not just about
    // either side of it.
    expect(
      withholdsTheRelease(
        press({ from: AT(0, 0), to: AT(CLICK_MOVEMENT_THRESHOLD, 0) }),
      ),
    ).toBe(true)
  })

  it('treats a press just past the threshold as a drag', () => {
    expect(
      withholdsTheRelease(
        press({ from: AT(0, 0), to: AT(CLICK_MOVEMENT_THRESHOLD + 0.01, 0) }),
      ),
    ).toBe(false)
  })

  it('measures the distance, not either axis', () => {
    // 3-4-5: under the threshold on both axes, over it in fact. Measuring per
    // axis would call this a click and let a small drag be swallowed.
    expect(withholdsTheRelease(press({ from: AT(0, 0), to: AT(3, 4) }))).toBe(
      true,
    )
    expect(withholdsTheRelease(press({ from: AT(0, 0), to: AT(4, 4) }))).toBe(
      false,
    )
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

describe('putsTheMarkDownOnRelease', () => {
  it('puts the mark down when a finger tapped', () => {
    expect(putsTheMarkDownOnRelease(press({ kind: 'touch' }))).toBe(true)
  })

  it('leaves the mark alone when the finger travelled', () => {
    // It panned. The decided behaviour is that the paper moves and the mark
    // stays exactly as it was.
    expect(
      putsTheMarkDownOnRelease(
        press({ kind: 'touch', toOnScreen: AT(400, 460) }),
      ),
    ).toBe(false)
  })

  it('says nothing about a mouse, which deselected as it pressed', () => {
    expect(putsTheMarkDownOnRelease(press())).toBe(false)
  })

  it('measures a finger in screen pixels, not page units', () => {
    /*
     * The two live in different spaces, and only one of them is honest about
     * how far a thumb moved: page coordinates have the zoom divided out, so at
     * 25% a finger that barely moved covers a great many page units. Judged
     * there, a tap on a zoomed-out page would be read as a pan and the mark
     * would never go down.
     */
    const zoomedOut = press({
      kind: 'touch',
      from: AT(0, 0),
      to: AT(40, 0),
      fromOnScreen: AT(400, 300),
      toOnScreen: AT(404, 300),
    })

    expect(putsTheMarkDownOnRelease(zoomedOut)).toBe(true)
  })
})
