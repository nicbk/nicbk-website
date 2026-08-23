import { describe, expect, it } from 'vitest'
import { panelAround, READER_PANEL_ATTRIBUTE } from './reader-panel'

/**
 * Finding the reader's own panel from something drawn inside it.
 *
 * Small, and worth its own test for the fallback: the magnifier is summoned
 * mid-gesture, and a missing ancestor must produce a lens somewhere sensible
 * rather than an exception in the middle of a drag.
 */

describe('panelAround', () => {
  it('measures the panel an element sits in', () => {
    const panel = document.createElement('div')
    panel.setAttribute(READER_PANEL_ATTRIBUTE, '')
    panel.getBoundingClientRect = () =>
      ({ left: 40, top: 120, right: 800 }) as DOMRect

    const inside = document.createElement('div')
    panel.append(inside)

    expect(panelAround(inside)).toEqual({ left: 40, top: 120, right: 800 })
  })

  it('falls back to the window when there is no panel to find', () => {
    // Should not happen — the reader always renders one — and if it ever does,
    // a lens held inside the window beats no lens at all.
    expect(panelAround(document.createElement('div'))).toEqual({
      left: 0,
      top: 0,
      right: window.innerWidth,
    })
  })

  it('falls back the same way when asked about nothing', () => {
    expect(panelAround(null).right).toBe(window.innerWidth)
  })
})
