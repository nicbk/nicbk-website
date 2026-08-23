import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PinchWatch } from './pinch'
import { usePinch } from './pinch'

/**
 * What counts as a pinch, and for how long.
 *
 * The decision this module exists to make, driven the way a browser makes it:
 * real `PointerEvent`s at the window. Nothing here asserts that the paper
 * zooms — that is the library's, and it listens to touch events of its own.
 */

/** A finger, as the browser raises it. */
function finger(
  type: string,
  pointerId: number,
  target: EventTarget = window,
): void {
  target.dispatchEvent(
    new PointerEvent(type, { pointerType: 'touch', pointerId, bubbles: true }),
  )
}

/** Anything that is not a finger: a mouse, a stylus. */
function other(type: string, pointerType: string, pointerId: number): void {
  window.dispatchEvent(
    new PointerEvent(type, { pointerType, pointerId, bubbles: true }),
  )
}

/** A component that does nothing but watch, which is all this module offers. */
function watching(watch?: PinchWatch) {
  function Watcher() {
    usePinch(watch)
    return null
  }

  return render(<Watcher />)
}

/**
 * Whether a pinch is in flight right now.
 *
 * Asked through a fresh render because nothing re-renders when a finger lands —
 * the answer lives in a box shared by every caller, and reading it from a
 * component is how the reader's own guards read it.
 */
function pinchingNow(): boolean {
  let answer = false
  function Reader() {
    answer = usePinch().current.pinching
    return null
  }
  render(<Reader />)
  return answer
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePinch', () => {
  it('is not a pinch while one finger is down', () => {
    watching()
    finger('pointerdown', 1)

    expect(pinchingNow()).toBe(false)
  })

  it('is a pinch as the second finger lands', () => {
    watching()
    finger('pointerdown', 1)
    finger('pointerdown', 2)

    expect(pinchingNow()).toBe(true)
  })

  it('stays a pinch until the last finger lifts', () => {
    /*
     * Lifting one finger does not turn the other back into an ordinary press.
     * The gesture the reader made was a pinch, and what is left is its tail —
     * handing that to a live tool would draw a stray mark as the hand comes off
     * the glass.
     */
    watching()
    finger('pointerdown', 1)
    finger('pointerdown', 2)

    finger('pointerup', 1)
    expect(pinchingNow()).toBe(true)

    finger('pointerup', 2)
    expect(pinchingNow()).toBe(false)
  })

  it('counts a finger the browser took away as lifted', () => {
    // How a touch gesture usually ends when the browser claims it: cancelled,
    // not lifted. Missing it would leave the reader permanently mid-pinch.
    watching()
    finger('pointerdown', 1)
    finger('pointerdown', 2)
    finger('pointercancel', 1)
    finger('pointercancel', 2)

    expect(pinchingNow()).toBe(false)
  })

  it('never makes a pinch out of a mouse or a stylus', () => {
    /*
     * A mouse cannot produce a second pointer, and two styluses is not a
     * gesture anyone makes. Counting them would mean a stray synthetic event
     * could silence the whole reader.
     */
    watching()
    other('pointerdown', 'mouse', 1)
    other('pointerdown', 'pen', 2)
    finger('pointerdown', 3)

    expect(pinchingNow()).toBe(false)
  })

  it('tells its watcher once, as the pinch begins', () => {
    const onBegin = vi.fn()
    watching({ onBegin })

    finger('pointerdown', 1)
    expect(onBegin).not.toHaveBeenCalled()

    finger('pointerdown', 2)
    finger('pointerdown', 3)

    expect(onBegin).toHaveBeenCalledTimes(1)
  })

  it('tells its watcher when a gesture starts, once per gesture', () => {
    /*
     * The moment anything a press is about to destroy has to be remembered —
     * and it must be *this* listener that says so. A second listener kept by the
     * watcher would race this one, and mounted the wrong way round the second
     * finger's press overwrites what the first finger's was supposed to
     * preserve. That was a real defect, caught by
     * `use-pinch-recovery.test.tsx`, and this is the property that removed it.
     */
    const onFirstFinger = vi.fn()
    watching({ onFirstFinger })

    finger('pointerdown', 1)
    finger('pointerdown', 2)
    expect(onFirstFinger).toHaveBeenCalledTimes(1)

    finger('pointerup', 1)
    finger('pointerup', 2)
    finger('pointerdown', 3)
    expect(onFirstFinger).toHaveBeenCalledTimes(2)
  })

  it('names the first finger’s press, not the one that made it a pinch', () => {
    /*
     * The one that has to be repaired: the first press is the one a tool heard
     * and the one that cleared the selection, and a cancel has to be aimed at
     * the element it landed on or the plugin's capture release is refused.
     */
    const paper = document.createElement('div')
    document.body.append(paper)
    const second = document.createElement('div')
    document.body.append(second)
    const onBegin = vi.fn()
    watching({ onBegin })

    finger('pointerdown', 7, paper)
    finger('pointerdown', 8, second)

    expect(onBegin).toHaveBeenCalledWith({ target: paper, pointerId: 7 })
  })

  it('starts the next gesture from an empty hand', () => {
    const onBegin = vi.fn()
    watching({ onBegin })

    finger('pointerdown', 1)
    finger('pointerdown', 2)
    finger('pointerup', 1)
    finger('pointerup', 2)

    finger('pointerdown', 3)
    expect(pinchingNow()).toBe(false)
    expect(onBegin).toHaveBeenCalledTimes(1)
  })

  it('forgets a hand left mid-gesture when the reader goes away', () => {
    // A reader can close the paper with two fingers on it. A finger left in the
    // count would make the next reader's first press a pinch.
    const { unmount } = watching()
    finger('pointerdown', 1)
    unmount()

    watching()
    finger('pointerdown', 2)

    expect(pinchingNow()).toBe(false)
  })

  it('stops listening once nothing is watching', () => {
    const { unmount } = watching()
    unmount()

    finger('pointerdown', 1)
    finger('pointerdown', 2)

    // Nothing was counted while nobody was watching, so mounting again finds an
    // empty hand rather than a pinch that began before it existed.
    expect(pinchingNow()).toBe(false)
  })
})
