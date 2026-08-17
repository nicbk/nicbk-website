import { describe, expect, it } from 'vitest'
import { isBlankPaper, PAPER_ATTRIBUTE } from './blank-paper'

/**
 * What counts as "the reader clicked away from everything".
 *
 * The distinction is narrow and the consequence is not: get it wrong in one
 * direction and a selected mark can never be put down; get it wrong in the
 * other and pressing a mark deselects it as you press it.
 */

function element(tag: string, attributes: Record<string, string> = {}) {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value)
  }
  return node
}

describe('isBlankPaper', () => {
  it('recognises the rendered page', () => {
    expect(isBlankPaper(element('img', { [PAPER_ATTRIBUTE]: '' }))).toBe(true)
  })

  it('does not mistake an annotation’s own image for the page', () => {
    // A mark with an appearance stream renders as an `<img>` too, which is why
    // this is an attribute rather than a check on the element's type. Were it
    // the latter, pressing such a mark would deselect it in the same gesture.
    expect(isBlankPaper(element('img'))).toBe(false)
  })

  it('does not treat anything drawn over the page as the page', () => {
    for (const tag of ['div', 'span', 'button', 'svg']) {
      expect(isBlankPaper(element(tag))).toBe(false)
    }
  })

  it('answers no rather than throwing when there is no target', () => {
    // A pointer event's target is nullable, and a deselect handler is not the
    // place to find that out.
    expect(isBlankPaper(null)).toBe(false)
  })
})
