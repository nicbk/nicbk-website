import { describe, expect, it } from 'vitest'
import { type Frontmatter, parseFrontmatter } from './frontmatter-schema'

describe('parseFrontmatter', () => {
  const valid = {
    title: 'A Post',
    date: '2026-06-15',
    description: 'A short summary.',
  }

  it('parses valid frontmatter, coercing the date to a Date', () => {
    const fm = parseFrontmatter(valid, 'a-post')
    expect(fm.title).toBe('A Post')
    expect(fm.description).toBe('A short summary.')
    expect(fm.date).toBeInstanceOf(Date)
    expect(fm.date.toISOString()).toBe('2026-06-15T00:00:00.000Z')
  })

  it('defaults draft to false and tags to an empty array', () => {
    const fm = parseFrontmatter(valid, 'a-post')
    expect(fm.draft).toBe(false)
    expect(fm.tags).toEqual([])
  })

  it('keeps provided optional fields', () => {
    const fm = parseFrontmatter(
      { ...valid, tags: ['x', 'y'], draft: true, updated: '2026-06-20' },
      'a-post',
    )
    expect(fm.tags).toEqual(['x', 'y'])
    expect(fm.draft).toBe(true)
    expect(fm.updated?.toISOString()).toBe('2026-06-20T00:00:00.000Z')
  })

  it.each([
    'title',
    'date',
    'description',
  ] as const)('throws (naming the post) when required field %s is missing', (field) => {
    const incomplete = { ...valid }
    delete (incomplete as Record<string, unknown>)[field]
    expect(() => parseFrontmatter(incomplete, 'broken-post')).toThrow(
      /broken-post/,
    )
  })

  it('throws on a malformed date', () => {
    expect(() =>
      parseFrontmatter({ ...valid, date: 'not-a-date' }, 'broken-post'),
    ).toThrow(/broken-post/)
  })

  it('infers a type whose date is a Date, not a string', () => {
    const fm: Frontmatter = parseFrontmatter(valid, 'a-post')
    // A compile-time check that survives at runtime: the inferred type gives
    // Date methods, which a raw string would not have.
    expect(fm.date.getUTCFullYear()).toBe(2026)
  })
})
