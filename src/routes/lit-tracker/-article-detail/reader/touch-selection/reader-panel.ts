import type { PanelBounds } from './magnifier-view'

/**
 * The reader's own scroll panel, found from something drawn inside it.
 *
 * The magnifier is positioned against the window — it floats above everything,
 * including the page it is magnifying — so it needs to know where the reader
 * ends, or dragging a handle to the margin would push half of it over the
 * sidebar, or off the screen entirely.
 *
 * **An attribute rather than a class or a role.** The panel is EmbedPDF's
 * `Viewport`, which takes arbitrary props, so it can say what it is: the same
 * approach `blank-paper.ts` takes to the page image, and for the same reason. A
 * CSS-module class would tie this to a hashed name, and the `role`/`aria-label`
 * pair the viewport already carries is there for assistive technology, not as a
 * selector for this.
 */

/** Marks the reader's scroll panel. Set in `pdf-reader.tsx` on the viewport. */
export const READER_PANEL_ATTRIBUTE = 'data-reader-panel'

/**
 * The bounds of the panel `element` sits in, in client coordinates.
 *
 * Falls back to the window when there is no panel to be found — which should
 * not happen, and if it ever does, a magnifier held inside the window is a far
 * better outcome than none at all.
 */
export function panelAround(element: Element | null): PanelBounds {
  const panel = element?.closest(`[${READER_PANEL_ATTRIBUTE}]`)
  if (!panel) {
    return { left: 0, top: 0, right: window.innerWidth }
  }

  const bounds = panel.getBoundingClientRect()
  return { left: bounds.left, top: bounds.top, right: bounds.right }
}
