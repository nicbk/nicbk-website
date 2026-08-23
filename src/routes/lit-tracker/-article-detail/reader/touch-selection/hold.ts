import type { Position } from '@embedpdf/models'

/**
 * When a finger resting on the paper becomes a request to select a word.
 *
 * **Why a hold at all, and not a drag.** A browser latches its `touch-action`
 * decision when a gesture *begins*: the paper declares itself pannable so a
 * thumb can scroll it (`reading-mode.ts`), which means the browser has already
 * been told it may pan this touch, and no API takes that back mid-gesture. A
 * hold contests nothing — the finger never moves, so the browser never pans, and
 * the gesture is free to mean something else. That is the whole reason the
 * decided model is "long press selects the word" rather than "long press, then
 * drag": see `reader-annotation.md`'s 2026-08-22 revision.
 *
 * Both numbers below were settled with the user rather than guessed, and both
 * are platform norms rather than this project's inventions — a gesture that
 * every phone already teaches is one nobody has to learn here.
 */

/**
 * How long the finger must rest before the word under it is selected.
 *
 * 500ms is what both mobile platforms wait — Android's
 * `ViewConfiguration.getLongPressTimeout`, and roughly what Chrome waits before
 * offering its own context menu. Shorter and a slow, deliberate scroll starts
 * selecting; longer and the gesture feels broken before it fires.
 */
export const HOLD_DURATION_MS = 500

/**
 * How far the finger may drift and still be resting.
 *
 * 10px sits between Android's ~8dp touch slop and iOS's ~10pt, which is to say:
 * about as still as a thumb on glass can be. In practice the browser usually
 * settles this first — once it decides the gesture is a pan it cancels the
 * pointer stream and the hold is abandoned with it — so this is the second line
 * of defence, not the first.
 *
 * **Screen pixels, deliberately.** The interaction manager hands its handlers
 * *page* coordinates, with the zoom already divided out (`restorePosition`), so
 * a tolerance expressed there would be four times stricter at 400% than at
 * 100% — the same finger, judged differently for having zoomed in. The
 * normalized event carries `clientX`/`clientY`, and those are what this
 * measures.
 */
export const HOLD_MOVEMENT_TOLERANCE_PX = 10

export interface PressToJudge {
  /** How long the finger has been down, in milliseconds. */
  heldForMs: number
  /** Where the press began, in *screen* coordinates. */
  from: Position
  /** Where the finger is now, in screen coordinates. */
  to: Position
}

/**
 * True when this press has become a hold: long enough, and still enough.
 *
 * Both halves are required at once. A press that wandered is a scroll however
 * long it lasts, and a press that has not lasted is nothing yet.
 */
export function isHold({ heldForMs, from, to }: PressToJudge): boolean {
  if (heldForMs < HOLD_DURATION_MS) {
    return false
  }
  return !hasWandered(from, to)
}

/**
 * Whether the finger has moved far enough to have meant something else.
 *
 * Separate from {@link isHold} because it is asked at a different moment: this
 * is what abandons a hold *while* it is being waited for, on every move, before
 * the duration is up.
 */
export function hasWandered(from: Position, to: Position): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) > HOLD_MOVEMENT_TOLERANCE_PX
}
