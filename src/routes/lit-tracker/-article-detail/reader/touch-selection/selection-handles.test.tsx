import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SelectionHandleAnchors } from './handle-anchors'
import {
  SELECTION_HANDLE_ATTRIBUTE,
  SelectionHandles,
} from './selection-handles'

/**
 * The grips: where they are drawn, what they respond to, and how big the thing
 * a thumb has to hit actually is.
 *
 * Two of those are DOM facts and one is a stylesheet fact, so this test reads
 * both — the size of a touch target is a decision with an accessibility floor
 * under it, and asserting it against the CSS is the only place it can be
 * asserted at all (jsdom applies no stylesheets). `src/styles/contrast.test.ts`
 * audits the colour palette the same way, for the same reason.
 */

const ANCHORS: SelectionHandleAnchors = {
  start: { x: 100, top: 40, bottom: 52 },
  end: { x: 260, top: 40, bottom: 52 },
}

/** A press on a handle, as the browser would raise it. */
function pointerEvent(type: string, x = 0, y = 0): PointerEvent {
  return new PointerEvent(type, {
    pointerId: 1,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  })
}

function renderHandles(
  anchors: SelectionHandleAnchors = ANCHORS,
  scale = 1,
  handlers: Partial<{
    onGrab: (end: unknown, finger: unknown) => void
    onDrag: (finger: unknown) => void
    onRelease: () => void
  }> = {},
) {
  const result = render(
    <SelectionHandles
      anchors={anchors}
      scale={scale}
      onGrab={handlers.onGrab ?? vi.fn()}
      onDrag={handlers.onDrag ?? vi.fn()}
      onRelease={handlers.onRelease ?? vi.fn()}
    />,
  )

  /*
   * Queried by attribute because these carry no role and no name on purpose:
   * they are a touch affordance, hidden from assistive technology, which
   * reaches the same selection through the pointer and the keyboard. The grip
   * is the control; the element it sits in is the box that positions it.
   */
  const grips = [
    ...result.container.querySelectorAll<HTMLElement>(
      `[${SELECTION_HANDLE_ATTRIBUTE}]`,
    ),
  ]

  return {
    ...result,
    grips,
    handles: grips.map((grip) => grip.parentElement),
  }
}

describe('SelectionHandles', () => {
  it('draws one handle at each end of the selection', () => {
    const { handles } = renderHandles()

    expect(handles).toHaveLength(2)
    expect(handles[0]).toHaveStyle({ left: '100px', top: '40px' })
    expect(handles[1]).toHaveStyle({ left: '260px', top: '40px' })
  })

  it('spans the line it bounds, so the bar covers the whole of it', () => {
    const { handles } = renderHandles()

    expect(handles[0]).toHaveStyle({ height: '12px' })
  })

  it('follows the zoom', () => {
    // Position scales with the paper — the handle belongs to a boundary between
    // two glyphs, wherever the zoom has put them.
    const { handles } = renderHandles(ANCHORS, 2)

    expect(handles[0]).toHaveStyle({
      left: '200px',
      top: '80px',
      height: '24px',
    })
  })

  it('draws only the end that belongs to this page', () => {
    // What a selection spanning a page break will look like from each of its
    // two pages. Today only a whole-page-less range produces it; the rendering
    // is already right for the day one does.
    const { handles } = renderHandles({ start: ANCHORS.start, end: null })

    expect(handles).toHaveLength(1)
  })

  it('reports the end that was grabbed, and where the finger was', () => {
    const onGrab = vi.fn()
    const { grips } = renderHandles(ANCHORS, 1, { onGrab })

    grips[1]?.dispatchEvent(pointerEvent('pointerdown', 265, 55))

    expect(onGrab).toHaveBeenCalledWith('end', { x: 265, y: 55 })
  })

  it('follows the finger, and stops when it lets go', () => {
    const onDrag = vi.fn()
    const onRelease = vi.fn()
    const { grips } = renderHandles(ANCHORS, 1, { onDrag, onRelease })
    const grip = grips[0]

    grip?.dispatchEvent(pointerEvent('pointerdown', 100, 50))
    grip?.dispatchEvent(pointerEvent('pointermove', 140, 50))
    expect(onDrag).toHaveBeenCalledWith({ x: 140, y: 50 })

    grip?.dispatchEvent(pointerEvent('pointerup', 140, 50))
    grip?.dispatchEvent(pointerEvent('pointermove', 180, 50))
    expect(onDrag).toHaveBeenCalledTimes(1)
    expect(onRelease).toHaveBeenCalledTimes(1)
  })

  it('ignores a finger that was never on it', () => {
    // Pointer capture routes a whole gesture to this element, including one
    // that began somewhere else entirely.
    const onDrag = vi.fn()
    const { grips } = renderHandles(ANCHORS, 1, { onDrag })

    grips[0]?.dispatchEvent(pointerEvent('pointermove', 140, 50))

    expect(onDrag).not.toHaveBeenCalled()
  })

  it('keeps the whole gesture away from the page beneath it', () => {
    /*
     * The load-bearing detail of the whole drag, and it is every event rather
     * than the first. EmbedPDF's text handler clears the selection on every
     * pointer-down it sees, on an ancestor of this element — so a press that
     * reached it would delete the selection this handle is attached to, and the
     * handle with it, before the drag began. Its *moves* are worse: measured
     * against whatever anchor that handler last took, they start a drag
     * selection of its own over the top of the one being adjusted. Both were
     * seen happening.
     */
    const beneath = vi.fn()
    const { container, grips } = renderHandles()
    for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
      container.addEventListener(type, beneath)
    }

    grips[0]?.dispatchEvent(pointerEvent('pointerdown', 100, 50))
    grips[0]?.dispatchEvent(pointerEvent('pointermove', 140, 50))
    grips[0]?.dispatchEvent(pointerEvent('pointerup', 140, 50))

    expect(beneath).not.toHaveBeenCalled()
  })

  it('tells whoever is listening when it is taken away mid-drag', () => {
    // A handle unmounts when the selection collapses or its page scrolls out of
    // the virtualized window. Leaving a drag believed-in-flight would leave the
    // magnifier on screen with no finger under it.
    const onRelease = vi.fn()
    const { grips, unmount } = renderHandles(ANCHORS, 1, { onRelease })

    grips[0]?.dispatchEvent(pointerEvent('pointerdown', 100, 50))
    unmount()

    expect(onRelease).toHaveBeenCalledTimes(1)
  })
})

describe('the target a thumb has to hit', () => {
  const stylesheet = readFileSync(
    join(__dirname, 'selection-handles.module.css'),
    'utf8',
  )

  /** Everything declared in the first block matching a selector. */
  function rulesFor(selector: string): string {
    const start = stylesheet.indexOf(selector)
    if (start === -1) {
      throw new Error(
        `No such rule in selection-handles.module.css: ${selector}`,
      )
    }
    return stylesheet.slice(
      stylesheet.indexOf('{', start) + 1,
      stylesheet.indexOf('}', start),
    )
  }

  function sizeIn(rules: string, property: string): number {
    const match = rules.match(new RegExp(`${property}:\\s*([\\d.]+)rem`))
    if (!match?.[1]) {
      throw new Error(`No ${property} in rem: ${rules}`)
    }
    return Number(match[1]) * 16
  }

  it('is at least the 24px WCAG 2.2 AA asks for, and then some', () => {
    /*
     * SC 2.5.8, the floor this site conforms to
     * (research/accessibility/conformance-target.md). 44px is the platform
     * norm and what was settled on; this test defends the floor rather than
     * the exact number, so the design can move without a test having to be
     * argued with — but not below the line.
     */
    const target = rulesFor('.grip::after')

    expect(sizeIn(target, 'width')).toBeGreaterThanOrEqual(24)
    expect(sizeIn(target, 'height')).toBeGreaterThanOrEqual(24)
  })

  it('is larger than the dot it surrounds', () => {
    // The point of the rule: the graphic is small because it sits over the
    // reader's paper, and the target is large because it is aimed at with a
    // thumb. If they ever became the same size, the handle would look right and
    // be unusable.
    const graphic = sizeIn(rulesFor('.grip {'), 'width')
    const target = sizeIn(rulesFor('.grip::after'), 'width')

    expect(target).toBeGreaterThan(graphic)
  })
})
