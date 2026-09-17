import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EDGE_INSET,
  edgeShift,
  menuPlacement,
  READER_TOOLBAR_ATTRIBUTE,
  useMenuPlacement,
} from './menu-placement'

/**
 * Where a floating menu goes so the reader's toolbar cannot cover it.
 *
 * The decision is pure and tested here; the hook around it only supplies
 * rectangles. That split is the point — what is worth asserting is *when* the
 * menu moves, and rectangles are the whole of the input.
 *
 * The reader's toolbar cannot be painted over: the menu is rendered inside a
 * page wrapper carrying `z-index: 1`, inside a viewport carrying `z-index: 0`,
 * and the bar is the viewport's sibling. Lifting the menu means lifting the
 * paper, which is a defect this reader already fixed once. So it moves.
 */

/** A toolbar floating at the top of the document, centred. */
const TOOLBAR = rect({ top: 90, bottom: 130, left: 500, right: 940 })

function rect({
  top,
  bottom,
  left,
  right,
}: {
  top: number
  bottom: number
  left: number
  right: number
}): DOMRect {
  return {
    top,
    bottom,
    left,
    right,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

/** An anchor centred under the toolbar, at the given distance down the page. */
function anchorAt(top: number): DOMRect {
  return rect({ top, bottom: top + 30, left: 660, right: 780 })
}

describe('menuPlacement', () => {
  it('hangs above the anchor when there is room', () => {
    // The default, and the right one: above keeps the menu clear of the thing
    // the reader is looking at.
    expect(menuPlacement(anchorAt(600), 36, 120, TOOLBAR)).toBe('above')
  })

  it('drops below the anchor when the toolbar would cover it', () => {
    // A mark just under the bar: hanging above would put the menu behind it.
    expect(menuPlacement(anchorAt(150), 36, 120, TOOLBAR)).toBe('below')
  })

  it('stays above when the anchor is clear of the bar horizontally', () => {
    // The bar is centred and does not span the document, so a mark in the
    // top-left corner already has its menu in the clear. Flipping it would move
    // a perfectly visible menu for nothing.
    const corner = rect({ top: 150, bottom: 180, left: 220, right: 340 })

    expect(menuPlacement(corner, 36, 120, TOOLBAR)).toBe('above')
  })

  it('gives the same answer whichever side the menu is currently on', () => {
    /*
     * The property the whole shape of this function exists for.
     *
     * A rule phrased as "it overlaps now, so move it" flips back the moment
     * moving stops the overlap, and the menu oscillates on every measurement.
     * Deciding from the anchor and the menu's *height* — neither of which
     * changes when the menu moves — makes the answer stable by construction.
     * Calling twice with identical input is the closest a pure function gets to
     * proving it never settles into a loop.
     */
    const anchor = anchorAt(150)
    const first = menuPlacement(anchor, 36, 120, TOOLBAR)
    const second = menuPlacement(anchor, 36, 120, TOOLBAR)

    expect(first).toBe('below')
    expect(second).toBe(first)
  })

  it('moves a taller menu that a shorter one would have cleared', () => {
    // Opening the note editor makes the menu taller, which is the same
    // collision arriving from the other direction — the anchor never moved.
    const anchor = anchorAt(200)

    expect(menuPlacement(anchor, 36, 120, TOOLBAR)).toBe('above')
    expect(menuPlacement(anchor, 120, 120, TOOLBAR)).toBe('below')
  })

  it('hangs above when there is no toolbar on screen', () => {
    // The inert reader renders none, and neither does a unit test that mounts
    // a menu on its own. Above is what the stylesheet already says.
    expect(menuPlacement(anchorAt(100), 36, 120, null)).toBe('above')
  })

  it('does not move a menu that clears the bar by a hair', () => {
    // Slack, deliberately: the two menus space themselves differently and this
    // decision does not know which is asking. A few pixels of pessimism is the
    // correct kind of wrong — it moves early rather than leaving a menu half
    // under the bar.
    const clear = anchorAt(178)

    expect(menuPlacement(clear, 36, 120, TOOLBAR)).toBe('above')
  })
})

/**
 * Keeping a menu on the screen sideways.
 *
 * A phone, 375px wide, and the widths these menus really have: a mark's
 * controls are two icon buttons, a selection's bar is capped at 21rem, and the
 * note editor inside the mark's menu is `min(20rem, 60vw)` — 225px there
 * (`features/it-fits-the-screen/research.md`).
 */

const PHONE = 375
/** A mark's controls: two icon buttons and their padding. */
const MARK_MENU = 84
/** A selection's bar at its cap, 21rem. */
const SELECTION_BAR = 336

/** A mark starting `left` from the screen's edge. */
function markAt(left: number): Pick<DOMRect, 'left'> {
  return { left }
}

describe('edgeShift', () => {
  it('leaves a menu that fits exactly where it is', () => {
    // The commonest case by far, and the one criterion 2 protects: a mark in
    // the middle of a page must not move by a pixel.
    expect(edgeShift(markAt(120), MARK_MENU, PHONE)).toBe(0)
  })

  it('leaves a menu near the left edge alone', () => {
    // Close to an edge is not across it. The rule recovers a menu that cannot
    // be pressed; it does not tidy one that can.
    expect(edgeShift(markAt(4), MARK_MENU, PHONE)).toBe(0)
  })

  it('slides a menu that would hang off the right back inside', () => {
    // A mark 320px across a 375px screen: its controls would end at 404, which
    // is 45px past the screen and 61 past where a popup is allowed to stop.
    const shift = edgeShift(markAt(320), MARK_MENU, PHONE)

    expect(shift).toBe(-45)
    expect(320 + shift + MARK_MENU).toBe(PHONE - EDGE_INSET)
  })

  it('stops at the same inset every other popup stops at', () => {
    // `--space-md`, which is what the portalled surfaces cap themselves with
    // and what the citation preview hands Base UI. Two families of floating
    // surface, one edge.
    const shift = edgeShift(markAt(200), SELECTION_BAR, PHONE)

    expect(200 + shift + SELECTION_BAR).toBe(PHONE - EDGE_INSET)
  })

  it('gives the same answer however many times it is asked', () => {
    /*
     * The property this shape exists for, as `menuPlacement` argues above: the
     * input is the anchor and the menu's *width*, neither of which a shift
     * changes. A rule that read the menu's current position would undo itself
     * on the next measurement and oscillate.
     */
    const mark = markAt(320)
    const first = edgeShift(mark, MARK_MENU, PHONE)

    expect(edgeShift(mark, MARK_MENU, PHONE)).toBe(first)
    expect(first).not.toBe(0)
  })

  it('keeps the left edge of a menu too wide for the screen', () => {
    // 21rem fits a 375px phone with room either side; on the 320px screen at
    // the bottom of the sweep it does not, and something has to give. It is the
    // far end: the controls a reader reaches for first are the nearest ones.
    const narrow = 320
    const shift = edgeShift(markAt(60), SELECTION_BAR, narrow)

    expect(60 + shift).toBe(EDGE_INSET)
    expect(60 + shift + SELECTION_BAR).toBeGreaterThan(narrow)
  })

  it('does not move anything on a wide screen', () => {
    // The same mark on a desktop is nowhere near an edge.
    expect(edgeShift(markAt(320), SELECTION_BAR, 1400)).toBe(0)
  })
})

/**
 * The hook, and the one thing about it that broke.
 *
 * jsdom lays nothing out, so every rectangle it reports is zero and the
 * placement it computes is meaningless — which is why these tests stub
 * `getBoundingClientRect` rather than trusting the environment. What is being
 * asserted is not the arithmetic (that is `menuPlacement` above) but **when the
 * measurement happens**.
 */

const MENU = rect({ top: 150, bottom: 186, left: 660, right: 780 })
const ANCHOR = rect({ top: 150, bottom: 185, left: 660, right: 860 })

function stubRects() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      if (this.hasAttribute(READER_TOOLBAR_ATTRIBUTE)) {
        return TOOLBAR
      }
      return this.getAttribute('data-testid') === 'menu' ? MENU : ANCHOR
    },
  )
}

/** A menu that does not draw until it is asked to — as EmbedPDF's do not. */
function Harness({ shown }: { shown: boolean }) {
  const { ref, placement, shift } = useMenuPlacement()

  if (!shown) {
    return null
  }
  return (
    <div>
      <div
        ref={ref}
        data-testid="menu"
        data-placement={placement}
        style={{ translate: `${shift}px` }}
      />
    </div>
  )
}

/** A screen of `width`, which jsdom otherwise reports as zero. */
function stubViewport(width: number) {
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
    width,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useMenuPlacement', () => {
  it('slides a menu whose anchor sits near the screen edge', async () => {
    // The anchor stubbed here starts at 660 and the menu is 120 wide, so on a
    // 700px screen it would end 80px past where a popup may stop.
    stubRects()
    stubViewport(700)
    render(<Harness shown={true} />)

    const menu = await screen.findByTestId('menu')
    expect(menu.style.translate).toBe('-96px')
  })

  it('leaves a menu with room to spare untranslated', async () => {
    stubRects()
    stubViewport(1400)
    render(<Harness shown={true} />)

    const menu = await screen.findByTestId('menu')
    expect(menu.style.translate).toBe('0px')
  })

  it('measures when the menu appears, not only when the component mounts', async () => {
    /*
     * The regression this file exists for.
     *
     * EmbedPDF mounts one of these components per annotation on the page and
     * they render nothing until their own mark is picked up. Keyed on a
     * `RefObject` — whose identity never changes — the effect ran once against
     * an element that did not exist yet and never again, so the menu kept the
     * placement the stylesheet gave it. Every unit test passed; the browser
     * showed the menu still sitting under the toolbar.
     */
    stubRects()
    render(
      <>
        <div {...{ [READER_TOOLBAR_ATTRIBUTE]: '' }} />
        <Harness shown={false} />
      </>,
    )

    expect(screen.queryByTestId('menu')).toBeNull()

    render(
      <>
        <div {...{ [READER_TOOLBAR_ATTRIBUTE]: '' }} />
        <Harness shown={true} />
      </>,
    )

    expect(await screen.findByTestId('menu')).toHaveAttribute(
      'data-placement',
      'below',
    )
  })

  it('leaves a menu clear of the bar hanging above', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        if (this.hasAttribute(READER_TOOLBAR_ATTRIBUTE)) {
          return TOOLBAR
        }
        return this.getAttribute('data-testid') === 'menu'
          ? rect({ top: 600, bottom: 636, left: 660, right: 780 })
          : rect({ top: 600, bottom: 635, left: 660, right: 860 })
      },
    )
    render(
      <>
        <div {...{ [READER_TOOLBAR_ATTRIBUTE]: '' }} />
        <Harness shown={true} />
      </>,
    )

    expect(await screen.findByTestId('menu')).toHaveAttribute(
      'data-placement',
      'above',
    )
  })
})

describe('what the menu measures the toolbar as', () => {
  it('dodges the visible groups, not the bar’s full-width box', async () => {
    /*
     * The bar is `left: 0; right: 0` and transparent — only its groups are
     * opaque, and they cluster in the middle (`reader-toolbar.module.css`).
     * Measured by its own box it looks like it spans the document, and a mark
     * in the top-left corner would be moved out of the way of paper.
     *
     * Here the bar's box spans 200–1416 while its one group occupies 500–940,
     * and the anchor sits at 220–340: clear of the group, under the box. It
     * must stay where it is.
     */
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        if (this.hasAttribute(READER_TOOLBAR_ATTRIBUTE)) {
          return rect({ top: 81, bottom: 133, left: 200, right: 1416 })
        }
        if (this.getAttribute('data-testid') === 'group') {
          return rect({ top: 90, bottom: 130, left: 500, right: 940 })
        }
        return this.getAttribute('data-testid') === 'menu'
          ? rect({ top: 150, bottom: 186, left: 220, right: 340 })
          : rect({ top: 150, bottom: 185, left: 220, right: 340 })
      },
    )
    render(
      <>
        <div {...{ [READER_TOOLBAR_ATTRIBUTE]: '' }}>
          <div data-testid="group" />
        </div>
        <Harness shown={true} />
      </>,
    )

    expect(await screen.findByTestId('menu')).toHaveAttribute(
      'data-placement',
      'above',
    )
  })
})
