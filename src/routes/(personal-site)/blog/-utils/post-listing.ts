import { type PostListItem } from '~blog/posts'

/**
 * Pure listing transforms for the blog index, kept separate from the data layer
 * (`blog/posts.ts`) and the loader (`-lib/load-listing.ts`) so ordering and
 * draft-visibility can be unit-tested directly, without a glob or a router.
 */

/**
 * Newest post first, ordered by the frontmatter `date` — the single source of
 * truth for ordering (the folder name carries no date). Returns a new array;
 * the input is not mutated.
 */
export function sortByDateDesc(items: PostListItem[]): PostListItem[] {
  return [...items].sort(
    (a, b) => b.frontmatter.date.getTime() - a.frontmatter.date.getTime(),
  )
}

/**
 * Drops posts marked `draft: true`. Applied only for the production build (see
 * `-lib/load-listing.ts`), so drafts stay previewable during local development
 * but never appear on the live list.
 */
export function excludeDrafts(items: PostListItem[]): PostListItem[] {
  return items.filter((item) => !item.frontmatter.draft)
}

/**
 * The distinct set of tags across a listing, alphabetically sorted — the
 * options the tag filter (`-list-page/tag-filter`) offers. Derived from the same
 * (already draft-filtered) listing the page renders, so the tag filter never
 * advertises a tag that no visible post carries. Returns a new array.
 */
export function collectTags(items: PostListItem[]): string[] {
  const tags = new Set<string>()
  for (const { frontmatter } of items) {
    for (const tag of frontmatter.tags) {
      tags.add(tag)
    }
  }
  return [...tags].sort()
}
