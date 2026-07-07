import { type ComponentType } from 'react'
import { type Frontmatter, parseFrontmatter } from './frontmatter-schema'

/**
 * The blog's post-discovery data layer.
 *
 * Posts are found by scanning the content folder with Vite's
 * `import.meta.glob` rather than a hand-maintained registry, so adding a post
 * is just adding a folder. Two globs over the same files, kept deliberately
 * separate:
 *
 * - `contentModules` — the LAZY form (a map of `() => import()`), so a post's
 *   compiled MDX body is only fetched when that post is actually rendered.
 * - `frontmatterModules` — the `{ import: 'frontmatter' }` form, which pulls
 *   ONLY each module's `frontmatter` export, so reading a post's metadata
 *   never evaluates its body. (The list page in the next task relies on this
 *   to avoid bundling every post's content into the list.)
 *
 * The eager-vs-lazy distinction is load-bearing: an eager glob would silently
 * bundle every post's full body wherever the glob is used (see
 * research/documentation-content-conventions/blog-content-structure-and-naming.md).
 */

/** The compiled MDX module's shape: its default export is the post component. */
interface PostModule {
  default: ComponentType
}

const contentModules = import.meta.glob<PostModule>('/blog/posts/*/index.mdx')

const frontmatterModules = import.meta.glob<unknown>(
  '/blog/posts/*/index.mdx',
  {
    import: 'frontmatter',
  },
)

/** The content path for a slug — the inverse of `slugForPath`. */
function pathForSlug(slug: string): string {
  return `/blog/posts/${slug}/index.mdx`
}

/** Extract the slug (folder name) from a `/blog/posts/<slug>/index.mdx` path. */
function slugForPath(path: string): string {
  return path.replace('/blog/posts/', '').replace('/index.mdx', '')
}

/** Every post's slug (folder name), unordered. */
export function getPostSlugs(): string[] {
  return Object.keys(contentModules).map(slugForPath)
}

/**
 * Load and validate one post's frontmatter, without evaluating its body.
 * Returns `null` when no post has that slug — the route loader turns that into
 * a real 404. Throws (failing the build/request) if the post exists but its
 * frontmatter is invalid.
 */
export async function getPostFrontmatter(
  slug: string,
): Promise<Frontmatter | null> {
  const load = frontmatterModules[pathForSlug(slug)]
  if (load === undefined) {
    return null
  }
  return parseFrontmatter(await load(), slug)
}

/**
 * The lazy loader for a post's compiled component, or `null` if the slug is
 * unknown. Callers hand this straight to `React.lazy` so each post stays in
 * its own code-split chunk and the body loads only when the post renders.
 */
export function getPostContentLoader(
  slug: string,
): (() => Promise<PostModule>) | null {
  return contentModules[pathForSlug(slug)] ?? null
}
