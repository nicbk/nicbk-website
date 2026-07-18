import { describe, expect, it } from 'vitest'
import { loadPostListing } from './load-listing'

// Exercises the real post-discovery glob against the committed sample posts.
// Under Vitest, `import.meta.env.PROD` is false, so drafts are included here —
// production draft-exclusion is covered by the `excludeDrafts` unit test and the
// e2e run against the production build.
describe('loadPostListing', () => {
  it('returns the sample posts newest-first by date', async () => {
    const { posts } = await loadPostListing()
    expect(posts.map((p) => p.slug)).toEqual([
      'notes-on-minimalism', // 2026-07-02 (draft; visible in dev/test)
      'type-safe-frontmatter', // 2026-06-28
      'building-this-site', // 2026-06-15
    ])
  })

  it('carries frontmatter metadata only, not a compiled post body', async () => {
    const { posts } = await loadPostListing()
    const first = posts[0]
    expect(first).toBeDefined()
    expect(first?.frontmatter.title).toBeTruthy()
    expect(first?.frontmatter.date).toBeInstanceOf(Date)
    // The listing item is just { slug, frontmatter } — no post component/body
    // leaked in (the guard against eager MDX bundling on the list page).
    expect(Object.keys(first ?? {}).sort()).toEqual(['frontmatter', 'slug'])
  })
})
