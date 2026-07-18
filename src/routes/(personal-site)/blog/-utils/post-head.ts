import { type Frontmatter } from '~blog/frontmatter-schema'

/** A single `head()` meta entry (title, or a named/propertied meta tag). */
type MetaEntry =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

/**
 * Builds a blog post's document `<head>` meta from its frontmatter: the
 * `<title>`, the meta description, and basic Open Graph tags — with an
 * `og:image` only when the post declares a cover image. Kept as a pure function
 * (separate from the route) so it is unit-testable without a router.
 */
export function postHeadMeta(frontmatter: Frontmatter): MetaEntry[] {
  return [
    { title: frontmatter.title },
    { name: 'description', content: frontmatter.description },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: frontmatter.title },
    { property: 'og:description', content: frontmatter.description },
    ...(frontmatter.coverImage !== undefined
      ? [{ property: 'og:image', content: frontmatter.coverImage }]
      : []),
  ]
}
