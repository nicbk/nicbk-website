import type { Position } from '@embedpdf/models'
import { usePointerHandlers } from '@embedpdf/plugin-interaction-manager/react'
import { useEffect, useRef } from 'react'
import { isPuttingAMarkDown } from './click-away'

/**
 * Spends the click that puts a mark down on putting it down.
 *
 * Renders nothing. It exists to register one pointer handler per page, ahead of
 * whichever tool is live, and to stop that tool hearing about the one press
 * that was only ever meant to deselect. `click-away.ts` holds the decision; this
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
 * **Why the press is judged at its end.** Creation on a bare click happens on
 * pointer *up*, through the engine's click detector, and only if the pointer
 * stayed put. Stopping the press at its start would be simpler and would break
 * the criterion that a drag still creates — pulling a new shape out of bare
 * paper is unambiguous and must go on working. So the whole press is watched,
 * and only its ending is withheld.
 */

interface ClickAwayGuardProps {
  documentId: string
  pageIndex: number
  /** Whether a mark is selected *now* — read when a press begins. */
  isMarkSelected: () => boolean
}

export function ClickAwayGuard({
  documentId,
  pageIndex,
  isMarkSelected,
}: ClickAwayGuardProps) {
  const { register } = usePointerHandlers({ documentId, pageIndex })

  /**
   * What is known about the press in flight.
   *
   * A ref rather than state because nothing renders from it and because the
   * handlers below are registered once: state would go stale inside them, and
   * re-registering on every pointer move would tear the handler down mid-press.
   */
  const press = useRef<{ from: Position; wasSelected: boolean } | null>(null)

  /**
   * The two things that change on every render and must not re-register.
   *
   * `register` is rebuilt by the library's hook each time, so depending on it
   * would tear this handler down and remake it constantly — dropping any press
   * in flight. Held in a ref, the effect can depend on the page alone.
   */
  const latest = useRef({ register, isMarkSelected })
  latest.current = { register, isMarkSelected }

  useEffect(() => {
    return latest.current.register({
      onPointerDown: (position) => {
        // Read *before* the reader's own prop deselects: by pointer-up the
        // answer is always "nothing", which is why this is remembered.
        press.current = {
          from: position,
          wasSelected: latest.current.isMarkSelected(),
        }
      },
      onPointerUp: (position, event) => {
        const started = press.current
        press.current = null
        if (!started) {
          return
        }
        if (isPuttingAMarkDown({ ...started, to: position })) {
          /*
           * The tool never hears this one. Everything after it in the merged
           * list is skipped, which is exactly the tool's own `onPointerUp` and
           * so the click detector inside it.
           */
          event.stopImmediatePropagation()
        }
      },
      // A press the browser takes away — because it decided the gesture was a
      // scroll — ends nothing and must not leave this armed for the next one.
      onPointerCancel: () => {
        press.current = null
      },
    })
  }, [])

  return null
}
