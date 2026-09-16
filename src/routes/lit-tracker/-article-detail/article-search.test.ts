import { describe, expect, it } from 'vitest'
import { PATH_MAX } from '~/lit-tracker/citation-path'
import { articleSearchSchema, articleViaOf } from './article-search'

/**
 * The article route's URL: which view is showing, and the way back. What the
 * ids then *mean* is `~/lit-tracker/citation-path`'s; what is checked here is
 * that nothing but a list of this reader's article ids can get through.
 */

const A = '018f5b6c-0000-7000-8000-00000000000a'
const B = '018f5b6c-0000-7000-8000-00000000000b'

describe('the article route’s search', () => {
  it('keeps a path of article ids, in order', () => {
    expect(articleSearchSchema.parse({ via: [A, B] }).via).toEqual([A, B])
  })

  it('lifts a single hand-typed id into a path of one', () => {
    expect(articleSearchSchema.parse({ via: A }).via).toEqual([A])
  })

  it('drops a path that is not made of article ids', () => {
    // A malformed value degrades the parameter to absent rather than throwing
    // the page — and a path with a hole in it is not a safer version of it.
    expect(
      articleSearchSchema.parse({ via: ['not-an-id'] }).via,
    ).toBeUndefined()
    expect(
      articleSearchSchema.parse({ via: [A, 'not-an-id'] }).via,
    ).toBeUndefined()
  })

  it('refuses a path longer than one can be', () => {
    const many = Array.from(
      { length: PATH_MAX + 1 },
      (_, index) =>
        `018f5b6c-0000-7000-8000-${String(index).padStart(12, '0')}`,
    )

    expect(articleSearchSchema.parse({ via: many }).via).toBeUndefined()
  })

  it('carries the view alongside it, untouched', () => {
    expect(articleSearchSchema.parse({ view: 'citations', via: [A] })).toEqual({
      view: 'citations',
      via: [A],
    })
  })

  it('reads an absent path as no path', () => {
    expect(articleViaOf(articleSearchSchema.parse({}))).toEqual([])
    expect(articleViaOf(undefined)).toEqual([])
  })
})
