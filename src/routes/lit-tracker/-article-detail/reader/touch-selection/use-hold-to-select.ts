import type { Position } from '@embedpdf/models'
import { usePointerHandlers } from '@embedpdf/plugin-interaction-manager/react'
import { useEffect, useRef } from 'react'
import { READING_MODE } from '../reading-mode'
import { HOLD_DURATION_MS, hasWandered } from './hold'
import { usePointerKind } from './pointer-kind'

/**
 * A finger resting on the paper, and what it takes to notice.
 *
 * `hold.ts` holds the decision — how long, how still — and this holds the
 * plumbing, which is where the sharp edges are. Three of them shaped it:
 *
 * **The press is watched at the window once it has begun.** Only its *start* is
 * taken from the interaction manager, because that is what knows which page was
 * pressed, where on it, and which mode is live. Everything after that — the
 * drift that abandons the hold, the lift that ends it — is watched on the
 * window, because a page's handler chain can be stopped by anything registered
 * ahead of it. The reader already has such a guard (`click-away-guard.tsx`
 * swallows exactly one pointer-up), and a hold whose timer survived the finger
 * leaving would select a word half a second after the reader let go.
 *
 * **Once the hold has fired, the rest of that press is ours.** EmbedPDF's text
 * handler takes an anchor on every pointer-down and turns it into a drag
 * selection as soon as the pointer moves three page units — about three pixels
 * of the jitter a thumb makes while lifting, which would replace the word just
 * selected with a single character. So the moves and the lift that follow a
 * hold are stopped before they reach it. This works because handlers registered
 * without a `modeId` are walked in registration order, and this one is mounted
 * ahead of the selection layer.
 *
 * **A second finger is a pinch, not a hold.** Any further press abandons the one
 * in flight rather than arming a second.
 */

interface HoldToSelect {
  documentId: string
  pageIndex: number
  /**
   * Called when a press has become a hold, with the point on the page the
   * finger came to rest on — in page coordinates, the space glyphs live in.
   */
  onHold: (point: Position) => void
}

interface PressInFlight {
  /** Where the finger came down, in screen coordinates — see `hold.ts`. */
  from: Position
  /** The same moment, in page coordinates. */
  on: Position
  timer: ReturnType<typeof setTimeout>
  /** True once the word has been selected. */
  held: boolean
  /** Stops watching the window for this press. */
  release: () => void
}

export function useHoldToSelect({
  documentId,
  pageIndex,
  onHold,
}: HoldToSelect): void {
  const { register } = usePointerHandlers({ documentId, pageIndex })
  const pointerKind = usePointerKind()

  /*
   * Both change on every render and neither may re-register: the library
   * rebuilds `register` each time, and tearing the handler down mid-press would
   * drop the press. Held in a ref, the effect can depend on nothing at all —
   * the same shape `click-away-guard.tsx` uses, for the same reason.
   */
  const latest = useRef({ register, onHold })
  latest.current = { register, onHold }

  const press = useRef<PressInFlight | null>(null)

  useEffect(() => {
    function abandon(): void {
      const current = press.current
      press.current = null
      if (!current) {
        return
      }
      clearTimeout(current.timer)
      current.release()
    }

    function begin(on: Position, from: Position): void {
      function whileMoving(event: PointerEvent): void {
        const current = press.current
        if (!current || current.held) {
          // A hold that has fired is finished with the finger: what it does
          // next is the browser's business, and the selection stays put.
          return
        }
        if (hasWandered(current.from, { x: event.clientX, y: event.clientY })) {
          abandon()
        }
      }

      function whenLifted(): void {
        abandon()
      }

      const release = () => {
        window.removeEventListener('pointermove', whileMoving)
        window.removeEventListener('pointerup', whenLifted)
        window.removeEventListener('pointercancel', whenLifted)
      }
      window.addEventListener('pointermove', whileMoving)
      window.addEventListener('pointerup', whenLifted)
      window.addEventListener('pointercancel', whenLifted)

      press.current = {
        from,
        on,
        held: false,
        release,
        timer: setTimeout(() => {
          const current = press.current
          if (!current) {
            return
          }
          current.held = true
          latest.current.onHold(current.on)
        }, HOLD_DURATION_MS),
      }
    }

    const unregister = latest.current.register({
      onPointerDown: (position, event, modeId) => {
        const wasInFlight = press.current !== null
        abandon()

        // A second finger is a pinch — task 1's gesture — and never a hold.
        if (wasInFlight) {
          return
        }
        // A mouse resting on a word is a reader thinking. Only a finger asks.
        if (pointerKind.current !== 'touch') {
          return
        }
        // A live tool owns the drag: press-and-pull draws a mark, and a hold
        // in the middle of drawing one must not also select the text under it.
        if (modeId !== READING_MODE.id) {
          return
        }

        begin(position, { x: event.clientX, y: event.clientY })
      },
      onPointerMove: (_position, event) => {
        if (press.current?.held) {
          event.stopImmediatePropagation()
        }
      },
      onPointerUp: (_position, event) => {
        if (press.current?.held) {
          // Cleanup is left to the window listener, which runs after this one
          // and runs whether or not this handler was reached at all.
          event.stopImmediatePropagation()
        }
      },
      // A press the browser took away, because it decided the gesture was a
      // scroll after all.
      onPointerCancel: () => abandon(),
    })

    return () => {
      // Pages are virtualized: this one can be scrolled out of existence with a
      // finger still on it, and a timer left running would select a word on a
      // page that is no longer there.
      abandon()
      unregister?.()
    }
  }, [pointerKind])
}
