import { useEffect } from 'react'

/**
 * When two fingers are on the paper, and whose press started it.
 *
 * **Why this has to be watched at all.** EmbedPDF's zoom wrapper answers a
 * two-finger gesture by zooming the paper, and it does that from its own
 * `touchstart` listener on the viewport — it never takes the gesture away from
 * anything else. Meanwhile the interaction manager translates *every* pointer
 * from *every* finger into the page's handler chain, with no multi-touch guard
 * anywhere in it. So while the reader pinches, the selection plugin is dragging
 * a selection out of the same fingers and the live tool is drawing with them
 * (user-reported, 2026-08-23).
 *
 * Nothing in the library knows what a second finger means, so this reader has to
 * decide it. This module holds that decision — *a gesture is a pinch from the
 * moment a second finger lands until the last one lifts* — and nothing else:
 * what to do about it belongs to `pinch-guard.tsx` (which withholds) and
 * `use-pinch-recovery.ts` (which repairs).
 *
 * **At the window, on the capture phase**, for the same two reasons
 * `touch-selection/pointer-kind.ts` is: the number of fingers on the glass is a
 * property of the hand rather than of any page, and pages are virtualized, so a
 * per-page listener would mean a dozen installed and removed as the paper
 * scrolls. Capture also means this is up to date *before* the press reaches
 * whatever will act on it, which is what makes the guard's decision correct on
 * the very event that begins the pinch.
 */

/** The press a gesture began with — what a cancel has to be aimed at. */
export interface FirstFinger {
  /** Where it landed. The element that took the pointer capture, if any did. */
  target: EventTarget | null
  /** The browser's id for it. */
  pointerId: number
}

/** What anything acting on a pinch needs to know while one is happening. */
export interface PinchInFlight {
  /**
   * True from the second finger's press until the last finger lifts.
   *
   * **Not "two fingers are down right now."** Lifting one finger of a pinch
   * does not turn the remaining one back into a press the tools may have: the
   * gesture the reader made was a pinch, and what is left of it is the tail of
   * that gesture. Ending it early would hand a live tool a stray drag as the
   * hand comes off the glass.
   */
  pinching: boolean
}

/**
 * The fingers currently on the glass, in the order they landed, each remembered
 * by what it pressed.
 */
const fingers = new Map<number, EventTarget | null>()

/**
 * A mutable box rather than state: nothing renders from it, and a re-render per
 * finger would be a re-render per finger. Read inside pointer handlers, which
 * run far more often than anything that could re-subscribe.
 */
const inFlight: { current: PinchInFlight } = { current: { pinching: false } }

/**
 * What a watcher wants to hear about a gesture.
 *
 * **Both moments come from the one listener**, deliberately. The first version
 * of this had the caller keep a window listener of its own to notice the first
 * finger, and which of the two ran first depended on which component mounted
 * first — so the second finger's press overwrote the very thing the pinch was
 * supposed to put back. A test caught it; the fix was to stop having two
 * listeners to order.
 */
export interface PinchWatch {
  /**
   * Told as the *first* finger of a gesture lands — before the library has been
   * handed the same press, since this listens at the window on the capture
   * phase and the manager listens on the page. The moment to remember anything
   * that press is about to destroy.
   */
  onFirstFinger?: () => void
  /** Told once, when a second finger makes the gesture a pinch. */
  onBegin?: (first: FirstFinger) => void
}

const watchers = new Set<PinchWatch>()

/** How many components rely on this, so the listeners are installed once. */
let listeners = 0

function isFinger(event: PointerEvent): boolean {
  // A stylus is not a second finger: a pinch takes two, and two styluses is not
  // a gesture anyone makes. A mouse cannot produce a second pointer at all.
  return event.pointerType === 'touch'
}

function noteFingerDown(event: PointerEvent): void {
  if (!isFinger(event)) {
    return
  }

  if (fingers.size === 0) {
    for (const watcher of watchers) {
      watcher.onFirstFinger?.()
    }
  }

  fingers.set(event.pointerId, event.target)
  if (fingers.size < 2 || inFlight.current.pinching) {
    return
  }

  inFlight.current = { pinching: true }
  const [pointerId, target] = [...fingers][0] ?? [event.pointerId, event.target]
  for (const watcher of watchers) {
    watcher.onBegin?.({ target, pointerId })
  }
}

function noteFingerUp(event: PointerEvent): void {
  if (!isFinger(event)) {
    return
  }

  fingers.delete(event.pointerId)
  if (fingers.size === 0) {
    inFlight.current = { pinching: false }
  }
}

/**
 * Reads whether a pinch is in flight, without re-rendering when it changes.
 *
 * The returned box is shared by every caller, which is the point: it describes
 * the hand, and there is only one of those.
 *
 * @param watch told as a gesture starts and as it becomes a pinch. Optional
 * because most callers only need to know *whether* — the repairs a pinch needs
 * are made in one place (`use-pinch-recovery.ts`), not once per page. It must
 * be stable across renders, like any subscription.
 */
export function usePinch(watch?: PinchWatch): {
  readonly current: PinchInFlight
} {
  useEffect(() => {
    listeners += 1
    if (listeners === 1) {
      window.addEventListener('pointerdown', noteFingerDown, {
        capture: true,
        passive: true,
      })
      window.addEventListener('pointerup', noteFingerUp, {
        capture: true,
        passive: true,
      })
      // A press the browser took away still means a finger left the glass.
      window.addEventListener('pointercancel', noteFingerUp, {
        capture: true,
        passive: true,
      })
    }

    return () => {
      listeners -= 1
      if (listeners > 0) {
        return
      }
      window.removeEventListener('pointerdown', noteFingerDown, {
        capture: true,
      })
      window.removeEventListener('pointerup', noteFingerUp, { capture: true })
      window.removeEventListener('pointercancel', noteFingerUp, {
        capture: true,
      })
      // A reader who closes the paper mid-gesture must not leave a hand behind
      // for the next one.
      fingers.clear()
      inFlight.current = { pinching: false }
    }
  }, [])

  useEffect(() => {
    if (!watch) {
      return
    }
    watchers.add(watch)
    return () => {
      watchers.delete(watch)
    }
  }, [watch])

  return inFlight
}
