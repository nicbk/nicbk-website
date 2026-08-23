import { usePointerHandlers } from '@embedpdf/plugin-interaction-manager/react'
import { useLayoutEffect, useRef } from 'react'
import { usePinch } from './pinch'

/**
 * Keeps a pinch to itself: while two fingers are on the paper, nothing else
 * hears them.
 *
 * Renders nothing. It registers one pointer handler per page, ahead of the
 * library's own, and swallows every press and every movement for the length of
 * the gesture — so the paper zooms, and no text is selected, no mark is drawn,
 * and nothing already selected is disturbed. `pinch.ts` decides *when* a
 * gesture is a pinch; this decides *what the rest of the reader is told about
 * it*, which is: nothing.
 *
 * **Presses and moves, but never lifts.** A lift is the only thing that makes
 * the selection plugin's text handler drop its anchor — it implements no
 * cancel — and an anchor left behind turns the *next* gesture's first movement
 * into a drag selection. That is the mistake this feature has now made three
 * times in three different places, and the rule it produced lives in
 * `AGENTS.md`. Letting the lifts through costs nothing: a tool that was told its
 * pointer was cancelled ignores them (`if (!start) return`), and a text handler
 * with nothing in flight simply resets.
 *
 * **The first finger's press is not withheld**, and cannot be: a press cannot
 * know that a second one is coming half a second later. What that press already
 * did — clear the reader's selection, most visibly — is undone by
 * `use-pinch-recovery.ts` rather than prevented here.
 *
 * **Registered in a layout effect, and mounted after the touch selection.**
 * Handlers with no `modeId` are walked in the order they were registered, and
 * React runs every layout effect before any ordinary one — so this is ahead of
 * the selection plugin (which registers from an ordinary effect) and of the live
 * tool's mode handlers (which are always walked after the always-registered
 * ones). Behind `use-hold-to-select.ts`, though, deliberately: it drops the hold
 * it is timing when a second finger lands, and it can only do that if it hears
 * the press first.
 */

interface PinchGuardProps {
  documentId: string
  pageIndex: number
}

export function PinchGuard({ documentId, pageIndex }: PinchGuardProps) {
  const { register } = usePointerHandlers({ documentId, pageIndex })
  const pinch = usePinch()

  /*
   * The library rebuilds `register` on every render, so depending on it would
   * tear this handler down and remake it constantly — dropping any gesture in
   * flight. Held in a ref, the effect can depend on nothing that changes.
   */
  const latest = useRef({ register })
  latest.current = { register }

  useLayoutEffect(() => {
    return latest.current.register({
      onPointerDown: (_position, event) => {
        if (pinch.current.pinching) {
          event.stopImmediatePropagation()
        }
      },
      onPointerMove: (_position, event) => {
        if (pinch.current.pinching) {
          event.stopImmediatePropagation()
        }
      },
    })
  }, [pinch])

  return null
}
