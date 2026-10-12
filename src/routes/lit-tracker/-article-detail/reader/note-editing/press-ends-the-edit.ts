import type { Position } from '@embedpdf/models'
import { hasWandered } from '../touch-selection/hold'

/**
 * Which presses put down the note the reader is typing
 * (features/a-text-box-lets-go).
 *
 * **Any press outside the note, once it is over** — the way every text field
 * behaves. A press on the paper, on another page, between pages, on the
 * sidebar or the toolbar all count, because the engine's own rule (a press on
 * the bare page element) is met by none of them in this reader: the paper image
 * takes every press on the page, and the rule is per page besides.
 *
 * **Except a finger that travelled.** A thumb that scrolls the paper while the
 * reader is typing has not clicked away from anything, and ending the edit would
 * drop the phone's keyboard mid-sentence — the same rule `click-away.ts` applies
 * to a selected mark, for the same reason: the movement that would mean "away"
 * is the movement that scrolls. Measured in screen pixels, with the tolerance a
 * long press uses, for the reason `touch-selection/hold.ts` gives.
 */
export interface PressAway {
  kind: string
  /** Where the press began, in client coordinates. */
  from: Position
  /** Where it ended, likewise. */
  to: Position
}

export function pressEndsTheEdit({ kind, from, to }: PressAway): boolean {
  if (kind === 'touch') {
    return !hasWandered(from, to)
  }
  return true
}
