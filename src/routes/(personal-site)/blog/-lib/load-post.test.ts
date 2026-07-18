import { describe, expect, it } from 'vitest'
import { loadPostFrontmatter } from './load-post'

// Exercises the real post-discovery glob against the committed sample posts.
describe('loadPostFrontmatter', () => {
  it('returns validated frontmatter for an existing post', async () => {
    const { frontmatter } = await loadPostFrontmatter('building-this-site')
    expect(frontmatter.title).toContain('Building this site')
    expect(frontmatter.date).toBeInstanceOf(Date)
  })

  it('throws (a not-found) for an unknown slug', async () => {
    await expect(loadPostFrontmatter('no-such-post')).rejects.toBeTruthy()
  })
})
