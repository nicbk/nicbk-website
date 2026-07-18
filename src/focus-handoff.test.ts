import { afterEach, describe, expect, it } from 'vitest'
import { focusPageHeading, isPageNavigation } from './focus-handoff'

describe('isPageNavigation', () => {
  it('is a page navigation when the pathname changes', () => {
    expect(
      isPageNavigation({ pathname: '/blog' }, { pathname: '/about' }),
    ).toBe(true)
  })

  it('is NOT a page navigation for a same-path search-param update', () => {
    // The blog's live search/tag filters change only the search params; the
    // pathname is identical, so focus must stay on the filter control.
    expect(isPageNavigation({ pathname: '/blog' }, { pathname: '/blog' })).toBe(
      false,
    )
  })

  it('is NOT a page navigation on the initial load (no from location)', () => {
    expect(isPageNavigation(undefined, { pathname: '/blog' })).toBe(false)
  })
})

describe('focusPageHeading', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('focuses the main heading, making it programmatically focusable', () => {
    document.body.innerHTML = '<main><h1>blog</h1></main>'
    focusPageHeading()
    const heading = document.querySelector('h1') as HTMLElement
    expect(document.activeElement).toBe(heading)
    // Headings are not natively focusable — it gets a programmatic tab stop
    // that stays out of the Tab order.
    expect(heading).toHaveAttribute('tabindex', '-1')
  })

  it('falls back to the main-content landmark when there is no heading', () => {
    document.body.innerHTML = '<div id="main-content"></div>'
    focusPageHeading()
    expect(document.activeElement).toBe(document.getElementById('main-content'))
  })

  it('does nothing when neither target exists', () => {
    document.body.innerHTML = '<p>no landmarks here</p>'
    expect(() => focusPageHeading()).not.toThrow()
  })
})
