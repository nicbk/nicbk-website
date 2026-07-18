import { describe, expect, it } from 'vitest'
import { blogSearchSchema } from './search-schema'

describe('blogSearchSchema', () => {
  it('leaves both filters absent when nothing is provided', () => {
    // Absent (not defaulted to concrete values), so a bare `/blog` link is not
    // polluted with `?q=&tags=%5B%5D`.
    const parsed = blogSearchSchema.parse({})
    expect(parsed.q).toBeUndefined()
    expect(parsed.tags).toBeUndefined()
  })

  it('passes through a valid query and tag list', () => {
    expect(
      blogSearchSchema.parse({ q: 'hooks', tags: ['react', 'zod'] }),
    ).toEqual({ q: 'hooks', tags: ['react', 'zod'] })
  })

  it('lifts a lone tag string into a single-element array', () => {
    // A hand-typed `?tags=react` arrives as a bare string, not an array.
    expect(blogSearchSchema.parse({ tags: 'react' }).tags).toEqual(['react'])
  })

  it('drops a malformed query to absent', () => {
    expect(blogSearchSchema.parse({ q: 42 }).q).toBeUndefined()
  })

  it('drops malformed tags to absent', () => {
    expect(
      blogSearchSchema.parse({ tags: { nope: true } }).tags,
    ).toBeUndefined()
  })

  it('strips unknown search params', () => {
    expect(
      blogSearchSchema.parse({ q: 'x', utm_source: 'newsletter' }),
    ).toEqual({ q: 'x' })
  })
})
