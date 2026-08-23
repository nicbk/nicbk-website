import type { Position } from '@embedpdf/models'

/**
 * Whether a press that has just ended was *putting a mark down* rather than
 * asking for a new one.
 *
 * **The defect this decides.** Two behaviours the reader wants meet badly. The
 * tool stays live after a mark is made — decided with the user so that marking
 * six passages picks the tool once — and the engine's shape tools place a mark
 * on a bare click, which is how a box or a sticky note is put somewhere without
 * dragging one out. Together they mean that clicking away from a selected mark
 * *deselects it and stamps a new one*, and since deleting is a single click
 * with no undo, the tidy-up costs more than the mistake did.
 *
 * Neither behaviour is wrong, so neither is reversed. What is removed is the
 * third thing they do together, on exactly one press: the first one after a
 * mark was selected.
 *
 * **A drag is not a click, and that is a criterion rather than an accident.**
 * Pressing on bare paper with a mark selected and pulling out a new shape is
 * unambiguous — nobody drags a rectangle by mistake — so it still creates. Only
 * the click-to-place path is suppressed, which is why the distance travelled is
 * part of this decision and not just the fact of a selection.
 */

/**
 * How far a pointer may travel and still count as a click.
 *
 * **Mirrors the engine's own click detector**, which uses 5 and is the thing
 * being pre-empted: this has to agree with it, because a press that the engine
 * would treat as a click and this would treat as a drag is a press that creates
 * a mark the reader did not ask for — the whole defect, back again in a narrow
 * band. Not imported because the plugin does not export it; pinned by a test
 * that fails if the two ever disagree.
 */
export const CLICK_MOVEMENT_THRESHOLD = 5

export interface PressToJudge {
  /** Whether a mark was selected when the press began, not now — see below. */
  wasSelected: boolean
  /** Where the press began, in page coordinates. */
  from: Position
  /** Where it ended. */
  to: Position
}

/**
 * True when this press should be spent on deselecting and nothing else.
 *
 * `wasSelected` is deliberately *when the press began*. By the time it ends the
 * mark is already deselected — the reader releases it as the press starts, so
 * that a drag begins from a clean state — so asking the engine at this moment
 * would always answer "nothing selected" and this would never fire.
 */
export function isPuttingAMarkDown({
  wasSelected,
  from,
  to,
}: PressToJudge): boolean {
  if (!wasSelected) {
    return false
  }
  return distanceBetween(from, to) <= CLICK_MOVEMENT_THRESHOLD
}

function distanceBetween(from: Position, to: Position): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}
