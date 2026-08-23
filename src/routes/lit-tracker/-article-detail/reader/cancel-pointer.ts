/**
 * Tells whichever of EmbedPDF's tools is holding a press that this pointer was
 * taken away from it.
 *
 * **Why a dependency has to be told at all.** A tool starts drawing on
 * pointer-down and clears what it started on pointer-up *or* pointer-cancel, at
 * no other time. So whenever this reader withholds a press's ending — because
 * the press was spent on something else — the tool is left mid-draw, and the
 * reader watches a shape stretch from the old press to the cursor until they
 * press again. `AGENTS.md` states the general rule: intercepting a dependency's
 * input makes you its bookkeeper.
 *
 * **A real event, because that is the only door in.** The tool's handlers are
 * registered with the interaction manager, which builds them from DOM events on
 * the page; the capability exposes no "forget the gesture in progress".
 * Dispatching the cancel is also the honest description of what happened — this
 * press was taken away from that tool.
 *
 * Two callers, which is why this is a module rather than a function beside one
 * of them: the click that puts a mark down (`click-away-guard.tsx`) and the
 * second finger of a pinch (`pinch/use-pinch-recovery.ts`).
 */

/**
 * Hands the live tool the event it uses to put down what it was drawing.
 *
 * **Aimed at what the press landed on**, not at the page. The plugin releases
 * the pointer capture from the element the event arrives on, and the element
 * that took the capture was the press's own target — usually the page image.
 * Aimed anywhere else, the release is refused and the plugin throws where
 * nothing can catch it.
 *
 * It carries the pointer's real id for the same reason
 * (`touch-selection/pointer-kind.ts` keeps it), and the release is made
 * conditional for the length of this one synchronous dispatch: the plugin lets
 * go unconditionally, and by then the browser may already have done it —
 * implicit release happens as a press ends, and in a test no capture was ever
 * taken. A refused release is not an error worth showing a reader.
 */
export function tellTheToolItsPointerWasCancelled(
  target: unknown,
  pointerId: number,
): void {
  if (!(target instanceof Element)) {
    return
  }

  const release = target.releasePointerCapture
  const own = Object.getOwnPropertyDescriptor(target, 'releasePointerCapture')
  Object.defineProperty(target, 'releasePointerCapture', {
    configurable: true,
    value: function guardedRelease(this: Element, id: number) {
      if (this.hasPointerCapture(id)) {
        release.call(this, id)
      }
    },
  })

  try {
    target.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId,
        bubbles: true,
        cancelable: false,
      }),
    )
  } finally {
    // Back to exactly what was there: whatever the element carried itself, or —
    // as it almost always is — nothing, leaving the prototype's own showing.
    if (own) {
      Object.defineProperty(target, 'releasePointerCapture', own)
    } else {
      Reflect.deleteProperty(target, 'releasePointerCapture')
    }
  }
}
