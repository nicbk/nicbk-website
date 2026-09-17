import { useEffect, useState } from 'react'

/**
 * Where a floating menu sits relative to the mark or selection it is about.
 *
 * Both of the reader's floating menus — a mark's controls
 * (`annotation-selection-menu.tsx`) and a text selection's
 * (`selection-menu.tsx`) — hang *above* their anchor by default, which is the
 * right place: it keeps the menu clear of the thing the reader is looking at.
 * Near the top of the document it is the wrong place, because the reader's
 * toolbar floats there.
 */
export type MenuPlacement = 'above' | 'below'

/** Marks the reader's toolbar, so a menu can find the one thing it must dodge. */
export const READER_TOOLBAR_ATTRIBUTE = 'data-reader-toolbar'

/**
 * What the toolbar actually covers, which is **not** its own box.
 *
 * The bar is `left: 0; right: 0` and deliberately transparent: only its groups
 * are opaque, and they sit as one cluster in the middle, so the paper shows
 * through on either side (`reader-toolbar.module.css`, user-decided
 * 2026-08-13). Measured by its own rectangle it appears to span the document,
 * and a mark in the top-left corner — with nothing above it but paper — would
 * be told to move out of the way of something that is not there.
 *
 * The union of the groups is what a reader can see, so it is what a menu
 * dodges. Falls back to the element itself if it has no children, which is what
 * a test rendering a bare marker element gets.
 */
function visibleBounds(toolbar: Element): DOMRect {
  const groups = [...toolbar.children].map((child) =>
    child.getBoundingClientRect(),
  )
  if (groups.length === 0) {
    return toolbar.getBoundingClientRect()
  }

  const top = Math.min(...groups.map((g) => g.top))
  const bottom = Math.max(...groups.map((g) => g.bottom))
  const left = Math.min(...groups.map((g) => g.left))
  const right = Math.max(...groups.map((g) => g.right))
  return new DOMRect(left, top, right - left, bottom - top)
}

/**
 * The gap a menu leaves between itself and its anchor, in pixels.
 *
 * Read as slack rather than measured: the two menus space themselves slightly
 * differently (`--space-2xs`, and the selection menu adds a line's worth on top
 * of it), and the decision here does not need to know which. What it needs is
 * to not flip when the menu would clear the bar by a hair, so a few pixels of
 * pessimism is the correct kind of wrong.
 */
const ANCHOR_GAP = 12

/**
 * Whether a menu can hang above its anchor without the toolbar covering it.
 *
 * **Decided from the anchor, never from where the menu currently is.** A rule
 * phrased as "it overlaps now, so move it" is a rule that flips back the moment
 * moving stops the overlap — the menu would oscillate between the two positions
 * on every measurement. Computing the *hypothetical* above-position from the
 * anchor and the menu's height gives the same answer whichever side the menu is
 * on, so the decision is stable by construction.
 *
 * The horizontal test matters more than it looks: the bar is centred and does
 * not span the document, so a mark in the top-left corner has its menu clear of
 * the bar already, and flipping it would move a perfectly visible menu for
 * nothing.
 *
 * With no toolbar on screen — the inert reader, and every unit test that does
 * not render one — the answer is `above`, which is the default the CSS already
 * expresses.
 */
export function menuPlacement(
  anchor: DOMRect,
  menuHeight: number,
  menuWidth: number,
  toolbar: DOMRect | null,
): MenuPlacement {
  if (!toolbar) {
    return 'above'
  }

  const wouldTop = anchor.top - menuHeight - ANCHOR_GAP
  const wouldBottom = anchor.top
  const overlapsVertically =
    wouldTop < toolbar.bottom && wouldBottom > toolbar.top

  const left = anchor.left + anchor.width / 2 - menuWidth / 2
  const overlapsHorizontally =
    left < toolbar.right && left + menuWidth > toolbar.left

  return overlapsVertically && overlapsHorizontally ? 'below' : 'above'
}

/**
 * How far a menu stops short of the screen's edge, in pixels.
 *
 * `--space-md`, which is what every portalled surface in the app caps itself
 * with (`max-width: calc(100vw - 2 * var(--space-md))`) and what the citation
 * preview hands Base UI as its collision padding. Stated here as a number
 * because this is arithmetic on screen pixels, and read from the same token so
 * the two families of floating surface stop in the same place.
 */
export const EDGE_INSET = 16

/**
 * How far to slide a menu sideways so it stays on the screen.
 *
 * **These menus had no horizontal rule at all** until this existed
 * (features/it-fits-the-screen): they hang from the left edge of the mark or
 * selection they are about, so a mark on the right of the page put its controls
 * partly off the screen — measured on a phone, where a mark more than ~39px
 * from the left was enough. Their stylesheets cap their *width*, and a cap is
 * not a position.
 *
 * **Decided from the anchor, never from where the menu currently is**, for the
 * reason `menuPlacement` gives above: a rule phrased "it hangs off now, so move
 * it" is a rule that moves back the moment moving fixes the overhang. The
 * unshifted left edge is the anchor's, because that is where the stylesheet
 * puts the menu; the width is the menu's own, which a shift does not change. So
 * the same input always gives the same answer, however many times it is asked.
 *
 * **Slide, never flip** (user-decided 2026-09-17): the menu moves by the
 * smallest amount that makes it visible, rather than re-anchoring to the mark's
 * other edge — a menu that changed sides while a reader marked across a line
 * would read as unstable.
 *
 * The left edge wins a conflict: a menu wider than the screen starts at the
 * inset and runs off to the right, which keeps the first control — and, for a
 * mark's menu, every control the reader is most likely to want — reachable.
 */
export function edgeShift(
  anchor: Pick<DOMRect, 'left'>,
  menuWidth: number,
  viewportWidth: number,
): number {
  // Nothing measured, nothing moved — the same answer the vertical rule gives
  // when there is no toolbar on screen. A viewport of zero is a document that
  // has not been laid out (jsdom, and a menu measured before first paint), and
  // treating it as a screen 0px wide would fling every menu to the left margin.
  if (viewportWidth <= 0) {
    return 0
  }

  const over = anchor.left + menuWidth - (viewportWidth - EDGE_INSET)
  if (over <= 0) {
    // Nothing crosses the edge, so nothing moves. A menu merely *close* to the
    // left edge is left exactly where the stylesheet put it: the rule exists to
    // recover a menu that cannot be pressed, not to tidy one that can.
    return 0
  }

  const shift = -over
  return anchor.left + shift < EDGE_INSET ? EDGE_INSET - anchor.left : shift
}

/**
 * Keeps a floating menu out from under the reader's toolbar.
 *
 * **Why this exists rather than a `z-index`.** It was measured: the menu is
 * rendered by EmbedPDF inside a page wrapper that carries `z-index: 1`, inside
 * the viewport that carries `z-index: 0` — and the toolbar is the viewport's
 * *sibling*, outside both. For the menu to paint above the bar, the viewport's
 * whole subtree would have to, which is the paper painting over the toolbar: a
 * defect this reader already fixed once, on a user's report. A probe injected
 * inside the viewport at the maximum expressible `z-index` still lost to the
 * bar. So the menu cannot be raised; it can only be moved.
 * (features/surface-layering — user-decided 2026-09-13.)
 *
 * Re-measured on scroll and on resize, because both move the anchor under a
 * stationary bar: scrolling slides the mark up towards it, and opening the note
 * editor makes the menu taller, which is the same collision arriving from the
 * other direction. The scroll listener is on the window **in the capture
 * phase** — scroll events do not bubble, and the element that scrolls here is
 * the engine's, not this component's to attach to.
 *
 * **A callback ref, not a `RefObject`, and that is the whole correctness of
 * it.** EmbedPDF mounts one of these components per annotation on the page and
 * they draw nothing until their own mark is picked up, so the first run happens
 * while there is no element — and a `RefObject` never changes identity, so an
 * effect keyed on one never runs again when the element finally arrives. It
 * measured nothing, silently, and the menu stayed where the stylesheet put it.
 * Storing the node in state makes its arrival the thing that schedules the
 * measurement, which is the same "an order you did not choose" trap AGENTS.md
 * describes: the effect ran before the element existed. Caught in the browser;
 * every unit test still passed.
 */
export function useMenuPlacement(): {
  ref: (node: HTMLElement | null) => void
  placement: MenuPlacement
  /** Pixels to slide the menu sideways so it stays on screen; `0` when it fits. */
  shift: number
} {
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const [placement, setPlacement] = useState<MenuPlacement>('above')
  const [shift, setShift] = useState(0)

  useEffect(() => {
    const anchor = menu?.parentElement
    if (!menu || !anchor) {
      return
    }

    function measure() {
      if (!menu || !anchor) {
        return
      }
      const bar = document.querySelector(`[${READER_TOOLBAR_ATTRIBUTE}]`)
      const menuBox = menu.getBoundingClientRect()
      const anchorBox = anchor.getBoundingClientRect()
      setPlacement(
        menuPlacement(
          anchorBox,
          menuBox.height,
          menuBox.width,
          bar ? visibleBounds(bar) : null,
        ),
      )
      setShift(
        edgeShift(
          anchorBox,
          menuBox.width,
          document.documentElement.clientWidth,
        ),
      )
    }

    measure()

    // The window's own resize, which the observer above does not see: it
    // watches the menu, and a narrower screen moves the edge without changing
    // the menu by a pixel.
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    const resize = new ResizeObserver(measure)
    resize.observe(menu)

    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
      resize.disconnect()
    }
  }, [menu])

  return { ref: setMenu, placement, shift }
}
