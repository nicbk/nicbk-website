import { afterEach, describe, expect, it } from 'vitest'
import {
  panelAround,
  READER_PANEL_ATTRIBUTE,
  readerPanel,
  readerPanelScroll,
} from './reader-panel'

/**
 * Finding the reader's own panel — from something drawn inside it, and from the
 * document when the asking code has no element to start from.
 *
 * Small, and worth its own test for the fallback: the magnifier is summoned
 * mid-gesture and the auto-scroll measures against these numbers every frame, so
 * a missing panel must produce something sensible rather than an exception in
 * the middle of a drag.
 */

const BOUNDS = { left: 40, top: 120, right: 800, bottom: 900 }

function panelElement(): HTMLElement {
  const panel = document.createElement('div')
  panel.setAttribute(READER_PANEL_ATTRIBUTE, '')
  panel.getBoundingClientRect = () => BOUNDS as DOMRect
  return panel
}

afterEach(() => {
  document.querySelector(`[${READER_PANEL_ATTRIBUTE}]`)?.remove()
})

describe('panelAround', () => {
  it('measures the panel an element sits in', () => {
    const panel = panelElement()
    const inside = document.createElement('div')
    panel.append(inside)

    expect(panelAround(inside)).toEqual(BOUNDS)
  })

  it('falls back to the window when there is no panel to find', () => {
    // Should not happen — the reader always renders one — and if it ever does,
    // a lens held inside the window beats no lens at all.
    expect(panelAround(document.createElement('div'))).toEqual({
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    })
  })

  it('falls back the same way when asked about nothing', () => {
    expect(panelAround(null).right).toBe(window.innerWidth)
  })
})

describe('readerPanel', () => {
  it('finds the one panel on the page', () => {
    // What the drag uses: it outlives the page it began on, so it has no
    // element to look up from.
    document.body.append(panelElement())

    expect(readerPanel()).toEqual(BOUNDS)
  })

  it('falls back to the window when the reader is not on the page', () => {
    expect(readerPanel()).toEqual({
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    })
  })
})

describe('readerPanelScroll', () => {
  it('reads how far the paper has been scrolled, and how far it can go', () => {
    /*
     * From the element, not from the viewport plugin: the plugin's copy is a
     * frame or two behind, and a loop that adds a step to it every frame
     * compounds that into half the rate the curve asked for. Measured in the
     * browser at 295 px/s where 590 was asked.
     */
    const panel = panelElement()
    Object.defineProperty(panel, 'scrollTop', { get: () => 480 })
    Object.defineProperty(panel, 'scrollHeight', { get: () => 5000 })
    Object.defineProperty(panel, 'clientHeight', { get: () => 600 })
    document.body.append(panel)

    expect(readerPanelScroll()).toEqual({ top: 480, furthest: 4400 })
  })

  it('has no answer when the reader is not on the page', () => {
    // The same "nothing to scroll" its caller already handles.
    expect(readerPanelScroll()).toBeNull()
  })
})
