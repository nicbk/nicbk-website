import { usePointerHandlers } from '@embedpdf/plugin-interaction-manager/react'
import { useEffect, useRef } from 'react'
import { tellTheToolItsPointerWasCancelled } from './cancel-pointer'
import type { LiveTool, PressToJudge } from './click-away'
import {
  putsTheMarkDownOnRelease,
  withholdsThePress,
  withholdsTheRelease,
} from './click-away'
import { usePinch } from './pinch/pinch'
import { usePointerKind } from './touch-selection/pointer-kind'

/**
 * Spends the press that puts a mark down on putting it down.
 *
 * Renders nothing. It exists to register one pointer handler per page, ahead of
 * whichever tool is live, and to keep that tool from hearing the one press that
 * was only ever meant to deselect. `click-away.ts` holds the decision; this
 * holds the plumbing, and the plumbing is the part with the sharp edges.
 *
 * **Why a handler and not the page's `onPointerDown` prop.** The reader already
 * deselects from that prop, and could not suppress anything from there: a React
 * prop is delegated at the root, so it runs *after* the engine's own listener on
 * the element, and by then the tool has already been told. The interaction
 * manager, though, merges every handler registered for a page and walks them in
 * order, checking `isImmediatePropagationStopped()` between each — and it walks
 * the always-registered ones **before** the active mode's. Registering here with
 * no `modeId` puts this in the first group, which is the only place from which a
 * tool can be pre-empted.
 *
 * **Why a withheld release is followed by a cancel.** A tool starts drawing on
 * pointer-down and clears what it started on pointer-up *or* pointer-cancel, and
 * at no other time. Taking the release away therefore stops it making the mark
 * and leaves it mid-draw — which is exactly what the reader saw: a shape
 * stretching from the old press to the cursor until they pressed again. So the
 * tool is told the thing that is true, that for it this pointer was cancelled,
 * and it puts down what it was holding. (See `AGENTS.md`: intercepting a
 * dependency's input makes you its bookkeeper.)
 */

interface ClickAwayGuardProps {
  documentId: string
  pageIndex: number
  /** Whether a mark is selected *now* — read when a press begins. */
  isMarkSelected: () => boolean
  /** Which tool is live *now*, if any, and what a click with it would do. */
  activeTool: () => LiveTool | null
  /**
   * Puts the selected mark down.
   *
   * Only ever called for a finger. A mouse deselects as its press begins, from
   * the page's own prop, which is where it has always happened; a finger cannot,
   * because a press that becomes a scroll has to leave the mark alone.
   */
  onDeselect: () => void
}

/** What is known about the press in flight, before it is judged. */
type PressInFlight = Omit<PressToJudge, 'to' | 'toOnScreen'>

export function ClickAwayGuard({
  documentId,
  pageIndex,
  isMarkSelected,
  activeTool,
  onDeselect,
}: ClickAwayGuardProps) {
  const { register } = usePointerHandlers({ documentId, pageIndex })
  const pointer = usePointerKind()
  /*
   * Whether the press in flight turned out to be half of a pinch. This guard
   * never sees the second finger — `pinch-guard.tsx` withholds it — so without
   * asking, the lift at the end of a pinch would be judged as the end of the
   * ordinary press this one began as, and a barely-moved pinch would put the
   * reader's selected mark down.
   */
  const pinch = usePinch()

  /**
   * What is known about the press in flight.
   *
   * A ref rather than state because nothing renders from it and because the
   * handlers below are registered once: state would go stale inside them, and
   * re-registering on every pointer move would tear the handler down mid-press.
   */
  const press = useRef<PressInFlight | null>(null)

  /**
   * What the press landed on — the page image, a mark, whatever was under it.
   *
   * Kept because a cancel has to be aimed there rather than at the page: the
   * tool captured the pointer on *this* element, and the plugin releases that
   * capture from whatever element the cancel arrives on. Aimed at the page, the
   * release is refused and the plugin throws.
   */
  const pressedOn = useRef<unknown>(null)

  /**
   * The three things that change on every render and must not re-register.
   *
   * `register` is rebuilt by the library's hook each time, so depending on it
   * would tear this handler down and remake it constantly — dropping any press
   * in flight. Held in a ref, the effect can depend on the page alone.
   */
  const latest = useRef({ register, isMarkSelected, activeTool, onDeselect })
  latest.current = { register, isMarkSelected, activeTool, onDeselect }

  useEffect(() => {
    return latest.current.register({
      onPointerDown: (position, event) => {
        // Read *before* the reader's own prop deselects: by pointer-up the
        // answer is always "nothing", which is why this is remembered.
        const beginning: PressInFlight = {
          kind: pointer.current.kind,
          wasSelected: latest.current.isMarkSelected(),
          tool: latest.current.activeTool(),
          from: position,
          fromOnScreen: { x: event.clientX, y: event.clientY },
        }
        press.current = beginning
        pressedOn.current = event.target

        if (withholdsThePress(beginning)) {
          /*
           * The tool never hears this press begin, so there is nothing to
           * finish and nothing to clean up. For a finger that also leaves the
           * gesture to the browser, which pans the paper — the mark stays
           * selected, as decided.
           */
          event.stopImmediatePropagation()
        }
      },
      onPointerUp: (position, event) => {
        const started = press.current
        press.current = null
        if (!started) {
          return
        }
        if (pinch.current.pinching) {
          // The gesture was a pinch. It was spent on zooming, and the decided
          // behaviour is that a pinch leaves the marks exactly as they were.
          return
        }

        const judged: PressToJudge = {
          ...started,
          to: position,
          toOnScreen: { x: event.clientX, y: event.clientY },
        }

        if (withholdsTheRelease(judged)) {
          /*
           * Everything after this in the merged list is skipped, which is
           * exactly the tool's own `onPointerUp` and so the click detector
           * inside it.
           */
          event.stopImmediatePropagation()
          tellTheToolItsPointerWasCancelled(
            pressedOn.current,
            pointer.current.id,
          )
        }

        if (putsTheMarkDownOnRelease(judged)) {
          latest.current.onDeselect()
        }
      },
      // A press the browser takes away — because it decided the gesture was a
      // scroll — ends nothing. The mark stays selected, which is the decided
      // behaviour for a finger that panned, and this must not leave the guard
      // armed for the next press.
      onPointerCancel: () => {
        press.current = null
      },
    })
  }, [pointer, pinch])

  return null
}
