import { type PostListItem } from '~blog/posts'

/**
 * The active blog filters, mirroring the `/blog` route's search params
 * (see `../-list-page/search-schema.ts`): free-text search plus a set of
 * selected tags. Kept as a plain type here so the filtering logic can be
 * unit-tested without a router or the Zod schema.
 */
export interface BlogFilters {
  /** Free-text query, matched against title, description, and tags. */
  q: string
  /** Selected tags; a post must carry ALL of them to match (AND-composed). */
  tags: string[]
}

/**
 * Filter a post listing by the active search text and selected tags, preserving
 * the input order (the caller passes it already newest-first).
 *
 * - **Text** matches case-insensitively as a substring of the post title,
 *   description, or any tag; an empty/whitespace query matches everything.
 * - **Tags** are AND-composed: a post must carry every selected tag. No selected
 *   tags matches everything.
 * - The two are combined with AND — a post must satisfy both to be included.
 *
 * Pure and side-effect free (no data fetch), so the visible set is a direct
 * function of `(metadata list, filters)` and is unit-testable on its own.
 */
export function filterPosts(
  posts: PostListItem[],
  filters: BlogFilters,
): PostListItem[] {
  const query = filters.q.trim().toLowerCase()

  return posts.filter(({ frontmatter }) => {
    const hasAllTags = filters.tags.every((tag) =>
      frontmatter.tags.includes(tag),
    )
    if (!hasAllTags) {
      return false
    }

    if (query === '') {
      return true
    }

    // The searchable text for a post: its title, description, and tags, lowered
    // once so the substring check is case-insensitive.
    const haystack = [
      frontmatter.title,
      frontmatter.description,
      ...frontmatter.tags,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })
}
