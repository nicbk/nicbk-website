import { describe, expect, it } from 'vitest'
import {
  MAGNIFICATION,
  MAGNIFIER_GAP,
  MAGNIFIER_SIZE,
  magnifierPlacement,
  magnifierSource,
  pointInMagnifier,
} from './magnifier-view'

/**
 * Where the lens looks, and where it sits.
 *
 * Both are arithmetic that fails quietly: a source rectangle off by a factor
 * shows the right paper at the wrong magnification, and a placement that
 * forgets the panel's edge puts the lens half off the screen at exactly the
 * moment the reader is dragging toward that edge. Neither reads as a bug in a
 * screenshot.
 */

const PANEL = { left: 0, top: 100, right: 400 }

describe('magnifierSource', () => {
  it('centres on the boundary and shows a lens-worth of paper', () => {
    // 1:1 zoom, and an image rendered at one pixel per page unit, so the
    // arithmetic is visible: at 2× the lens shows half its own size of paper.
    const source = magnifierSource(
      { boundary: { x: 300, y: 200 }, scale: 1 },
      1,
    )

    expect(source.width).toBe(MAGNIFIER_SIZE.width / MAGNIFICATION)
    expect(source.height).toBe(MAGNIFIER_SIZE.height / MAGNIFICATION)
    expect(source.x).toBe(300 - source.width / 2)
    expect(source.y).toBe(200 - source.height / 2)
  })

  it('shows less paper the further the reader has zoomed in', () => {
    // The lens magnifies what is on screen, so at 200% it already shows half as
    // much page as at 100%. Missing this makes the lens useless when zoomed:
    // it would show a whole paragraph where the reader wanted a character.
    const atOne = magnifierSource({ boundary: { x: 0, y: 0 }, scale: 1 }, 1)
    const atTwo = magnifierSource({ boundary: { x: 0, y: 0 }, scale: 2 }, 1)

    expect(atTwo.width).toBe(atOne.width / 2)
  })

  it('measures in the image’s own pixels, not the page’s', () => {
    /*
     * The page is rendered at the device pixel ratio, so its bitmap holds two
     * or three times the detail its CSS size shows — which is the whole reason
     * a magnifier can be sharp. `drawImage` wants that rectangle in image
     * pixels, and a version of this that handed it page units would show a
     * quarter of the intended area on a 2× screen.
     */
    const source = magnifierSource({ boundary: { x: 100, y: 50 }, scale: 1 }, 3)

    expect(source.width).toBe((MAGNIFIER_SIZE.width / MAGNIFICATION) * 3)
    expect(source.x).toBe((100 - MAGNIFIER_SIZE.width / MAGNIFICATION / 2) * 3)
  })
})

describe('pointInMagnifier', () => {
  it('puts the boundary itself in the middle of the lens', () => {
    const boundary = { x: 120, y: 340 }

    expect(pointInMagnifier(boundary, { boundary, scale: 1 })).toEqual({
      x: MAGNIFIER_SIZE.width / 2,
      y: MAGNIFIER_SIZE.height / 2,
    })
  })

  it('spreads everything else out by the magnification', () => {
    // Ten page units to the right of the boundary, at 100% zoom and 2×, is
    // twenty lens pixels to the right of centre.
    const inLens = pointInMagnifier(
      { x: 130, y: 340 },
      { boundary: { x: 120, y: 340 }, scale: 1 },
    )

    expect(inLens.x).toBe(MAGNIFIER_SIZE.width / 2 + 10 * MAGNIFICATION)
  })

  it('takes the zoom into account as well', () => {
    const inLens = pointInMagnifier(
      { x: 130, y: 340 },
      { boundary: { x: 120, y: 340 }, scale: 2 },
    )

    expect(inLens.x).toBe(MAGNIFIER_SIZE.width / 2 + 10 * 2 * MAGNIFICATION)
  })
})

describe('magnifierPlacement', () => {
  it('floats above the finger, centred on it', () => {
    const { left, top, below } = magnifierPlacement({ x: 200, y: 400 }, PANEL)

    expect(left).toBe(200 - MAGNIFIER_SIZE.width / 2)
    expect(top).toBe(400 - MAGNIFIER_GAP - MAGNIFIER_SIZE.height)
    expect(below).toBe(false)
  })

  it('drops below the finger when there is no room above', () => {
    // Dragging a handle to the first line of a page, where the panel's top edge
    // would otherwise cut the lens in half.
    const { top, below } = magnifierPlacement({ x: 200, y: 120 }, PANEL)

    expect(below).toBe(true)
    expect(top).toBe(120 + MAGNIFIER_GAP)
  })

  it('stays inside the panel when the finger is at the left margin', () => {
    const { left } = magnifierPlacement({ x: 4, y: 400 }, PANEL)

    expect(left).toBeGreaterThanOrEqual(PANEL.left)
  })

  it('stays inside the panel when the finger is at the right margin', () => {
    const { left } = magnifierPlacement({ x: 398, y: 400 }, PANEL)

    expect(left + MAGNIFIER_SIZE.width).toBeLessThanOrEqual(PANEL.right)
  })
})
