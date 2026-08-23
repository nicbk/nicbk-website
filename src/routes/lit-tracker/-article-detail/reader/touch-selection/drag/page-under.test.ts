import type { PageVisibilityMetrics } from '@embedpdf/plugin-scroll'
import { describe, expect, it } from 'vitest'
import { pageUnder } from './page-under'

/**
 * The hit test, against metrics shaped exactly as the scroll plugin builds
 * them — including the two things about them that are easy to get wrong: the
 * page number counts from one, and the rectangle described is the *visible*
 * part of the page rather than the page.
 */

/**
 * One page in the panel, in the shape
 * `plugin-scroll`'s `calculatePageVisibility` produces.
 *
 * @param pageNumber 1-based, as the plugin reports it.
 * @param top where the visible part of the page starts, in panel coordinates.
 * @param clipped how much of the page's top is scrolled out of sight.
 */
function visible({
  pageNumber,
  top,
  height = 800,
  clipped = 0,
  scale = 1,
}: {
  pageNumber: number
  top: number
  height?: number
  clipped?: number
  scale?: number
}): PageVisibilityMetrics {
  return {
    pageNumber,
    viewportX: 40,
    viewportY: top,
    visiblePercentage: 100,
    original: {
      pageX: 0,
      pageY: clipped / scale,
      visibleWidth: 600,
      visibleHeight: height / scale,
      scale: 1,
    },
    scaled: {
      pageX: 0,
      pageY: clipped,
      visibleWidth: 600,
      visibleHeight: height,
      scale,
    },
  }
}

/** Two pages with a 20px gap between them, as the reader lays them out. */
const PAGES = [
  visible({ pageNumber: 3, top: 0, height: 300 }),
  visible({ pageNumber: 4, top: 320 }),
]

describe('pageUnder', () => {
  it('answers with a 0-based page index', () => {
    // The one place this conversion happens. The plugin counts pages from 1 and
    // every other page number in this reader counts from 0.
    expect(pageUnder(PAGES, { x: 100, y: 100 })?.pageIndex).toBe(2)
    expect(pageUnder(PAGES, { x: 100, y: 400 })?.pageIndex).toBe(3)
  })

  it('measures the point from the page, not from the panel', () => {
    const hit = pageUnder(PAGES, { x: 140, y: 400 })

    // 140 across, less the page's 40px left edge; 400 down, less the second
    // page's 320.
    expect(hit?.point).toEqual({ x: 100, y: 80 })
  })

  it('accounts for the part of the page scrolled off the top', () => {
    /*
     * The trap in these metrics: `viewportY` is where the page's *visible* part
     * begins, so a page half scrolled away would put every point 400 units too
     * early without `scaled.pageY` to put the origin back.
     */
    const scrolled = [visible({ pageNumber: 1, top: 0, clipped: 400 })]

    expect(pageUnder(scrolled, { x: 40, y: 10 })?.point.y).toBe(410)
  })

  it('divides the zoom out', () => {
    // Handlers all the way down work in page units, so a point at 200% is half
    // as far into the page as it is into the panel.
    const zoomed = [visible({ pageNumber: 1, top: 0, scale: 2 })]

    expect(pageUnder(zoomed, { x: 240, y: 100 })?.point).toEqual({
      x: 100,
      y: 50,
    })
  })

  it('puts a finger in the margin on the page beside it', () => {
    // Off the text but on the page: `glyphAt` will find nothing, the boundary
    // will stay put, and that is the behaviour a margin should have.
    const hit = pageUnder(PAGES, { x: 0, y: 100 })

    expect(hit?.pageIndex).toBe(2)
    expect(hit?.point.x).toBe(-40)
  })

  it('puts a finger in the gap on the nearer page', () => {
    // What keeps the magnifier showing paper while a drag crosses a break.
    expect(pageUnder(PAGES, { x: 100, y: 305 })?.pageIndex).toBe(2)
    expect(pageUnder(PAGES, { x: 100, y: 316 })?.pageIndex).toBe(3)
  })

  it('answers for a point above the first visible page', () => {
    // The toolbar's strip, or a finger dragged clean out of the panel.
    expect(pageUnder(PAGES, { x: 100, y: -200 })?.pageIndex).toBe(2)
  })

  it('has no answer when nothing is on screen', () => {
    expect(pageUnder([], { x: 100, y: 100 })).toBeNull()
  })
})
