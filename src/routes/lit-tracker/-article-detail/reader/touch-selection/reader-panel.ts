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
  return boundsOf(element?.closest(`[${READER_PANEL_ATTRIBUTE}]`) ?? null)
}

/**
 * The same bounds, asked for by the document rather than from inside a page.
 *
 * The drag that extends a selection across pages outlives the page it began on
 * (`drag/use-selection-drag.ts`), so it has no element to look up from — and
 * there is exactly one reader panel on a page to find.
 */
export function readerPanel(): PanelBounds {
  return boundsOf(document.querySelector(`[${READER_PANEL_ATTRIBUTE}]`))
}

/** How far the paper has been scrolled, and how far it can go. */
export interface PanelScroll {
  /** The current offset, in CSS pixels. */
  top: number
  /** The largest offset there is: the document's height less the panel's. */
  furthest: number
}

/**
 * The panel's scroll offset, read from the element rather than from the plugin.
 *
 * **Because the plugin's copy lags, and the auto-scroll compounds the lag.**
 * `viewport.getMetrics()` reports what the viewport plugin last stored, which is
 * updated from the element's own scroll event — a frame or two behind. A loop
 * that adds a step to that number every frame therefore adds it to a base that
 * has not caught up, and the paper moves at about half the rate the curve asked
 * for: **measured in the browser at 295 px/s where `auto-scroll.ts` asked for
 * 590**. Reading the element gives the number the reader's own eye is looking
 * at.
 *
 * The *writing* still goes through the viewport capability, which is the
 * library's business: it has scroll-activity bookkeeping of its own, and setting
 * the offset behind its back would leave that stale.
 *
 * Null when the reader is not on the page, which is the same "nothing to
 * scroll" the caller already handles.
 */
export function readerPanelScroll(): PanelScroll | null {
  const panel = document.querySelector(`[${READER_PANEL_ATTRIBUTE}]`)
  if (!panel) {
    return null
  }
  return {
    top: panel.scrollTop,
    furthest: panel.scrollHeight - panel.clientHeight,
  }
}

function boundsOf(panel: Element | null): PanelBounds {
  if (!panel) {
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    }
  }

  const bounds = panel.getBoundingClientRect()
  return {
    left: bounds.left,
    top: bounds.top,
    right: bounds.right,
    bottom: bounds.bottom,
  }
}
