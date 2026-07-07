import { excludeDrafts, sortByDateDesc } from '../-utils/post-listing'
import { getAllPostFrontmatter } from '~blog/posts'

/**
 * The blog list route's loader body: read every post's frontmatter (metadata
 * only — no bodies bundled), drop drafts in the production build, and order
 * newest-first. Extracted from the route so the assembly is unit-testable
 * without a router, and returns only serializable data (frontmatter), which the
 * list page renders.
 *
 * Drafts are excluded only when `import.meta.env.PROD` (the Nitro production
 * build) is true, so `npm run dev` still shows drafts for local preview while
 * the deployed list never does.
 */
export async function loadPostListing() {
  const all = await getAllPostFrontmatter()
  const visible = import.meta.env.PROD ? excludeDrafts(all) : all
  return { posts: sortByDateDesc(visible) }
}
