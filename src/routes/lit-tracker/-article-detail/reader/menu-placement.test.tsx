import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
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
  const { ref, placement } = useMenuPlacement()

  if (!shown) {
    return null
  }
  return (
    <div>
      <div ref={ref} data-testid="menu" data-placement={placement} />
    </div>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useMenuPlacement', () => {
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
