import { describe, expect, it } from 'vitest'
import { rootBreadcrumbSegment } from './breadcrumb'

describe('rootBreadcrumbSegment', () => {
  it('builds the segment from the email local part', () => {
    expect(rootBreadcrumbSegment({ email: 'nicbk@x.com' })).toBe('nicbk_home')
  })

  it('reduces punctuation to single underscores', () => {
    expect(rootBreadcrumbSegment({ email: 'first.last+tag@example.com' })).toBe(
      'first_last_tag_home',
    )
  })

  it('lowercases', () => {
    expect(rootBreadcrumbSegment({ email: 'NicBK@x.com' })).toBe('nicbk_home')
  })

  it('never leaves a dangling or doubled underscore', () => {
    expect(rootBreadcrumbSegment({ email: '..a--b..@example.com' })).toBe(
      'a_b_home',
    )
  })

  it('falls back to a generic handle when nothing usable survives', () => {
    // An address whose local part is entirely punctuation would otherwise
    // render as a bare "_home".
    expect(rootBreadcrumbSegment({ email: '...@example.com' })).toBe(
      'user_home',
    )
  })
})
