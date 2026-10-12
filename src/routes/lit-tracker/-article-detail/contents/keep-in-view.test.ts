import { describe, expect, it } from 'vitest'
import { keepInView } from './keep-in-view'

/** A list 100px tall at the top of the screen, scrolled to `scrollTop`. */
function list(scrollTop: number) {
  return {
    scrollTop,
    clientHeight: 100,
    getBoundingClientRect: () => ({ top: 0 }) as DOMRect,
  } as unknown as HTMLElement
}

/** An item whose content offset in the list is `offset`, 20px tall. */
function item(offset: number, scrollTop: number) {
  return {
    getBoundingClientRect: () =>
      ({ top: offset - scrollTop, height: 20 }) as DOMRect,
  } as unknown as HTMLElement
}

describe('keepInView', () => {
  it('leaves the list alone when the item is already shown', () => {
    const l = list(0)
    keepInView(l, item(40, 0), 'nearest')
    expect(l.scrollTop).toBe(0)
  })

  it('moves the least that shows an item below', () => {
    const l = list(0)
    keepInView(l, item(300, 0), 'nearest')
    expect(l.scrollTop).toBe(220)
  })

  it('moves the least that shows an item above', () => {
    const l = list(500)
    keepInView(l, item(300, 500), 'nearest')
    expect(l.scrollTop).toBe(300)
  })

  it('centres on request', () => {
    const l = list(0)
    keepInView(l, item(300, 0), 'center')
    expect(l.scrollTop).toBe(260)
  })
})
