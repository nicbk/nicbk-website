import type { Position } from '@embedpdf/models'
import { usePointerHandlers } from '@embedpdf/plugin-interaction-manager/react'
import { useLayoutEffect, useRef } from 'react'
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
 * **A finger's movement is this reader's, not the library's — but its lift is
 * the library's.** EmbedPDF's text handler takes an anchor on every pointer-down
 * and turns movement into a drag selection three page units later, which by
 * decision is no longer what a finger means: a touch selects by holding and
 * adjusts by handle. Left alone it does two visible kinds of damage — a thumb
 * that means to scroll drags a selection along with it, and the jitter of that
 * same thumb lifting after a hold replaces the word just selected with a single
 * character. So every move of a touch press is stopped before it reaches that
 * handler.
 *
 * **That works only because this registers first, and being first is not about
 * where the component sits.** Handlers registered without a `modeId` are walked
 * in the order they were registered, and the selection plugin registers its own
 * from an ordinary effect. React runs *every* layout effect before *any* passive
 * one, so a component earlier in the tree still loses to a library that
 * registers in a layout effect — and wins, whatever its position, by registering
 * in one itself. Rendering this ahead of the selection layer was not enough; the
 * browser showed a thumb dragging out a selection anyway, and this is the line
 * that fixed it.
 *
 * The pointer-up is *let through on purpose*: it is the only thing that makes
 * that handler drop its anchor, and an anchor left behind turns the next
 * gesture's first movement into a drag selection. Both halves were found in the
 * browser rather than reasoned out — see the comments on the handlers below.
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
  /** The wait for the hold, or null once it has fired or been given up on. */
  timer: ReturnType<typeof setTimeout> | null
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

  /*
   * A layout effect, and the only reason is order: this must be in the
   * always-registered list before the library's own text handler, because being
   * later there means being heard later, and being heard later means stopping
   * nothing. See the note above — it is the difference between a thumb scrolling
   * and a thumb dragging a selection out behind it.
   */
  useLayoutEffect(() => {
    /** Gives up on the hold, while the finger — and this press — carry on. */
    function stopWaiting(): void {
      const current = press.current
      if (!current?.timer) {
        return
      }
      clearTimeout(current.timer)
      current.timer = null
    }

    /** Forgets the press entirely: the finger is gone, or this page is. */
    function endPress(): void {
      const current = press.current
      stopWaiting()
      press.current = null
      current?.release()
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
          // The gesture is a scroll. The hold is off — but the press is still
          // watched, because what it must not become is a drag selection.
          stopWaiting()
        }
      }

      function whenLifted(): void {
        endPress()
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
        endPress()

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
      /*
       * **Every movement of a touch press is withheld, not only the ones after
       * a hold.** The library's text handler turns movement into a drag
       * selection three page units after the finger lands — so a thumb that
       * means to scroll selects a few words on its way, and the copy control
       * pops up over the paper as the page moves under it. That is the second
       * half of what the user reported ("trying to scroll just selects text");
       * task 2 gave the pan back to the browser, and this stops the library
       * selecting during it.
       *
       * Nothing else is listening. At page scope the annotation layer registers
       * a pointer-*down* only, and a tool's own handlers belong to its mode,
       * which is not this one — so what is withheld here is exactly the text
       * handler's drag, which by decision no longer belongs to a finger:
       * a touch selects by holding, and adjusts by handle.
       */
      onPointerMove: (_position, event) => {
        if (press.current) {
          event.stopImmediatePropagation()
        }
      },
      /*
       * **The lift is let through, and that is not an oversight.**
       *
       * The library's text handler takes its anchor on pointer-down — including
       * the one that becomes a hold — and drops it only on pointer-up. Swallow
       * that up, as an earlier version of this did, and the handler is left
       * holding an anchor from a gesture that ended: the *next* movement it
       * hears, even one belonging to a different gesture entirely, is far enough
       * from that stale point to start a drag selection, which replaces the word
       * the hold just selected. Found in the browser, where the first move of a
       * handle drag deleted the selection it was adjusting.
       *
       * Letting it through costs nothing: by then no drag has started, so all
       * the handler does with it is reset — which is precisely what is wanted.
       * Cleanup here is left to the window listener, which runs after this one
       * and runs whether or not this handler is reached at all.
       */
      // A press the browser took away, because it decided the gesture was a
      // scroll after all.
      onPointerCancel: () => endPress(),
    })

    return () => {
      // Pages are virtualized: this one can be scrolled out of existence with a
      // finger still on it, and a timer left running would select a word on a
      // page that is no longer there.
      endPress()
      unregister?.()
    }
  }, [pointerKind])
}
