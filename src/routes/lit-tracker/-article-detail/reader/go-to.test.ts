import { afterEach, describe, expect, it } from 'vitest'
import { jumpLanding, toolbarClearance, topClearOfToolbar } from './go-to'
import { READER_TOOLBAR_ATTRIBUTE } from './menu-placement'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('topClearOfToolbar', () => {
  it('stops short by the toolbar and the breathing room, in page points', () => {
    expect(topClearOfToolbar(336, 124, 1.52)).toBeCloseTo(336 - 132 / 1.52)
  })

  // A phone's toolbar can be deeper than a heading is down its page; the jump
  // then starts in the page above, or the heading lands under the controls.
  it('reaches above the page when the toolbar is deeper than the point', () => {
    expect(topClearOfToolbar(78, 85, 0.55)).toBeCloseTo(78 - 93 / 0.55)
  })
})

describe('toolbarClearance', () => {
  it('is nothing without a toolbar', () => {
    expect(toolbarClearance()).toBe(0)
    expect(jumpLanding()).toBe(8)
  })

  it('is how far the toolbar’s lowest group reaches into the reader', () => {
    document.body.innerHTML = `<div id="reader"><div ${READER_TOOLBAR_ATTRIBUTE}><span></span><span></span></div></div>`
    const reader = document.getElementById('reader') as HTMLElement
    const [first, second] = [
      ...(reader.querySelectorAll('span') as NodeListOf<HTMLElement>),
    ]
    reader.getBoundingClientRect = () => ({ top: 100 }) as DOMRect
    if (first && second) {
      first.getBoundingClientRect = () => ({ bottom: 140 }) as DOMRect
      second.getBoundingClientRect = () => ({ bottom: 156 }) as DOMRect
    }
    expect(toolbarClearance()).toBe(56)
    expect(jumpLanding()).toBe(64)
  })
})
