import type { Position } from '@embedpdf/models'
import { createsOnPress } from './annotation-tools'
import { hasWandered } from './touch-selection/hold'
import type { PointerKind } from './touch-selection/pointer-kind'

/**
 * What the press that puts a mark down is allowed to do.
 *
 * **The defect this decides.** Two behaviours the reader wants meet badly. The
 * tool stays live after a mark is made — decided with the user so that marking
 * six passages picks the tool once — and the engine's tools put a mark down on a
 * bare press, which is how a box or a sticky note is placed without dragging
 * one out. Together they mean that pressing away from a selected mark
 * *deselects it and makes a new one*, and since deleting is a single click with
 * no undo, the tidy-up costs more than the mistake did.
 *
 * Neither behaviour is reversed. What is removed is the third thing they do
 * together, on exactly one press: the first one after a mark was selected.
 *
 * **Where that press is stopped depends on the device, and on the tool.**
 * Settled with the user on 2026-08-24, after the first version of this — which
 * judged every press at its end — left a drawing tool sizing a shape that
 * followed the cursor:
 *
 * | | mouse | touch |
 * |---|---|---|
 * | press, release without moving | deselects; nothing drawn | deselects; nothing drawn |
 * | press, then move | draws the shape dragged out | pans the paper; the mark stays selected |
 *
 * A mouse can say at once whether a press became a drag, so its press is judged
 * at the end and a deliberate drag still creates — nobody drags a rectangle by
 * mistake. A finger cannot: the same movement that would draw is the movement
 * that scrolls, so while a mark is selected the press is withheld from the tool
 * at its *start* and the paper is left free to pan.
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
 *
 * In page units, like everything the engine hands its handlers. That is right
 * *here* — the point is to agree with the engine — and wrong for a finger, which
 * is judged in screen pixels below.
 */
export const CLICK_MOVEMENT_THRESHOLD = 5

export interface PressToJudge {
  /** What is pressing: a finger behaves differently from a mouse. */
  kind: PointerKind
  /** Whether a mark was selected when the press began, not now — see below. */
  wasSelected: boolean
  /** The tool that was live when it began, if any. */
  tool: string | null
  /** Where the press began, in page coordinates. */
  from: Position
  /** Where it ended, likewise. */
  to: Position
  /** Where it began, in screen coordinates. */
  fromOnScreen: Position
  /** Where it ended, likewise. */
  toOnScreen: Position
}

/** What the press began as: everything that can be known before it moves. */
export type PressBeginning = Pick<PressToJudge, 'kind' | 'wasSelected' | 'tool'>

/**
 * True when the live tool must not hear this press at all.
 *
 * Two cases, and both are places where judging at the end would be too late:
 *
 * - **A finger, while a mark is selected.** The movement that would draw is the
 *   movement that scrolls, and the browser decides which as the gesture begins.
 *   Withholding the press is what leaves that decision to the browser — the
 *   paper pans, and nothing is drawn or sized.
 * - **A tool that creates on the press itself**, whichever device. The sticky
 *   note commits at pointer-down, so by the time a release could be judged the
 *   note exists. This is why clicking away from a selected mark with that tool
 *   live has always left one behind.
 */
export function withholdsThePress({
  kind,
  wasSelected,
  tool,
}: PressBeginning): boolean {
  if (!wasSelected || tool === null) {
    return false
  }
  return kind === 'touch' || createsOnPress(tool)
}

/**
 * True when the live tool must not hear this press *end*.
 *
 * The mouse's half of the rule: a press that stayed put was a click, so it is
 * spent on deselecting; a press that travelled was a drag, so the tool keeps it
 * and draws what was dragged out.
 *
 * Only for presses the tool was allowed to hear in the first place —
 * {@link withholdsThePress} has already taken the others, and a tool that never
 * started has nothing to be stopped from finishing.
 */
export function withholdsTheRelease(press: PressToJudge): boolean {
  if (withholdsThePress(press) || !press.wasSelected || press.tool === null) {
    return false
  }
  return !travelled(press)
}

/**
 * True when this press should put the selected mark down as it ends.
 *
 * **Only a finger's press is judged here.** A mouse deselects as the press
 * begins, which is where it has always happened and where it feels right: by
 * the time a click completes, the reader may already be dragging a new mark. A
 * finger cannot deselect at the start, because a press that becomes a scroll
 * must leave the mark exactly as it was — so its decision waits for the end,
 * and answers "was this a tap?".
 *
 * A press the browser took away is not an ending at all: it panned, and the
 * caller never asks.
 */
export function putsTheMarkDownOnRelease(press: PressToJudge): boolean {
  if (press.kind !== 'touch' || !press.wasSelected) {
    return false
  }
  return !travelled(press)
}

/**
 * Whether the press moved far enough to have meant something other than a tap.
 *
 * **Two measurements, because they answer to two different authorities.** A
 * mouse is measured in page units against the engine's own threshold, since the
 * point is to agree with the engine about which presses it would have called
 * clicks. A finger is measured in screen pixels, because page coordinates have
 * the zoom divided out — a page-unit tolerance would be four times stricter at
 * 400% than at 100%, which is the mistake `touch-selection/hold.ts` records.
 */
function travelled(press: PressToJudge): boolean {
  if (press.kind === 'touch') {
    return hasWandered(press.fromOnScreen, press.toOnScreen)
  }
  return distanceBetween(press.from, press.to) > CLICK_MOVEMENT_THRESHOLD
}

function distanceBetween(from: Position, to: Position): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}
