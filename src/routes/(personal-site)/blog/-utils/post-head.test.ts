import { describe, expect, it } from 'vitest'
import { postHeadMeta } from './post-head'
import { type Frontmatter } from '~blog/frontmatter-schema'

const base: Frontmatter = {
  title: 'A Post',
  date: new Date('2026-06-15T00:00:00Z'),
  description: 'A summary.',
  tags: [],
  draft: false,
}

describe('postHeadMeta', () => {
  it('builds the title, description, and Open Graph tags', () => {
    const meta = postHeadMeta(base)
    expect(meta).toContainEqual({ title: 'A Post' })
    expect(meta).toContainEqual({ name: 'description', content: 'A summary.' })
    expect(meta).toContainEqual({ property: 'og:type', content: 'article' })
    expect(meta).toContainEqual({ property: 'og:title', content: 'A Post' })
    expect(meta).toContainEqual({
      property: 'og:description',
      content: 'A summary.',
    })
  })

  it('omits og:image when there is no cover image', () => {
    const hasOgImage = postHeadMeta(base).some(
      (entry) => 'property' in entry && entry.property === 'og:image',
    )
    expect(hasOgImage).toBe(false)
  })

  it('adds og:image only when a cover image is present', () => {
    const meta = postHeadMeta({ ...base, coverImage: '/cover.png' })
    expect(meta).toContainEqual({
      property: 'og:image',
      content: '/cover.png',
    })
  })
})
