import { useEffect } from 'react'

/**
 * What kind of pointer began the press in flight — a finger, a mouse, a stylus.
 *
 * **Why this exists at all.** EmbedPDF's interaction manager does not hand its
 * handlers the native event. It builds a plain object carrying `clientX`,
 * `clientY`, the modifier keys and the target, and **no `pointerType`** — so a
 * handler registered with it cannot tell a thumb from a mouse. Everything in
 * this folder must: a long press is a touch gesture, and a mouse held still for
 * half a second is a reader thinking, not a reader selecting.
 *
 * **Why one listener, at the window, for the whole reader.** The pointer's kind
 * is a property of the device in the reader's hand, not of any page — and pages
 * are virtualized, so a per-page listener would mean a dozen of them installed
 * and removed as the paper scrolls. This installs exactly one while anything is
 * listening, and none when nothing is.
 *
 * On the capture phase, so it is recorded before the press reaches whatever will
 * act on it: capture runs window-inward, and the page's own listeners are the
 * inward end of that.
 */

export type PointerKind = 'mouse' | 'pen' | 'touch'

/**
 * The last kind seen. A mutable box rather than state on purpose — nothing
 * renders from it, and a re-render per pointer-down would be a re-render per
 * pointer-down.
 */
const lastKind: { current: PointerKind } = { current: 'mouse' }

/** How many components are currently relying on it, so the listener is installed once. */
let listeners = 0

function record(event: PointerEvent): void {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    lastKind.current = event.pointerType
    return
  }
  // Anything else — including the empty string some browsers report for a
  // synthetic event — is treated as a mouse, which is the conservative answer:
  // it declines the touch gesture rather than offering it to a device that
  // cannot use it.
  lastKind.current = 'mouse'
}

/**
 * Reads which kind of pointer is being used, without re-rendering when it
 * changes.
 *
 * The returned box is shared by every caller, which is the point: it describes
 * the device, and there is only one of those.
 */
export function usePointerKind(): { readonly current: PointerKind } {
  useEffect(() => {
    listeners += 1
    if (listeners === 1) {
      window.addEventListener('pointerdown', record, {
        capture: true,
        passive: true,
      })
    }

    return () => {
      listeners -= 1
      if (listeners === 0) {
        window.removeEventListener('pointerdown', record, { capture: true })
      }
    }
  }, [])

  return lastKind
}
