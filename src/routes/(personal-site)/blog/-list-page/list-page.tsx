import { Link } from '@tanstack/react-router'
import { SearchInput } from '~/routes/-shared/components/search-input/search-input'
import { PostTags } from '../-components/post-tags/post-tags'
import { filterPosts } from '../-utils/filter-posts'
import { isoDate } from '../-utils/format-date'
import { collectTags } from '../-utils/post-listing'
import { useIncrementalReveal } from '../-utils/use-incremental-reveal'
import { TagFilter } from './tag-filter/tag-filter'
import { useBlogFilters } from './use-blog-filters'
import styles from './list-page.module.css'
import { type PostListItem } from '~blog/posts'

interface ListPageProps {
  /** Posts to list, already filtered (drafts) and ordered (newest-first). */
  posts: PostListItem[]
}

/**
 * How many rows to show initially and reveal per scroll. Sized so the current
 * handful of posts all appear at once (no hidden rows); it only starts paging
 * once the blog has more than this many published posts.
 */
const REVEAL_STEP = 15

/**
 * The `/blog` index: a flat, reverse-chronological list of posts, matching
 * high-level-guidance/design/blog-page.png, with a search bar and a tag filter
 * stacked above it. Each row is date / title / description with tags inline after
 * the description, and the columns line up down the page via a CSS grid (see the
 * module stylesheet). Ordering and draft-exclusion happen upstream in the route
 * loader (`-lib/load-listing.ts`).
 *
 * Filter state (search text + selected tags) lives in the URL, read and updated
 * through `useBlogFilters`; `filterPosts` derives the visible set from the full
 * listing and that state, still newest-first. The search bar and tag filter
 * stay rendered even when the filter matches nothing, so the reader can always
 * adjust or clear it.
 */
export function ListPage({ posts }: ListPageProps) {
  const { query, tags, setQuery, toggleTag } = useBlogFilters()

  const allTags = collectTags(posts)
  const visiblePosts = filterPosts(posts, { q: query, tags })

  return (
    <div className={styles.page}>
      {/* The page's single visible <h1> and the route-change focus-handoff
          target (src/focus-handoff.ts). */}
      <h1 className={styles.title}>blog</h1>

      {posts.length === 0 ? (
        // No posts exist at all: plain inline text, no spinner/illustration (the
        // design system's reactive-feedback default).
        <p className={styles.empty}>No posts yet.</p>
      ) : (
        <div className={styles.layout}>
          <SearchInput
            className={styles.search}
            value={query}
            onValueChange={setQuery}
            label="Search posts"
            placeholder="Search posts…"
          />
          <TagFilter tags={allTags} selected={tags} onToggle={toggleTag} />
          <div className={styles.listArea}>
            <PostList posts={visiblePosts} />
          </div>
        </div>
      )}
    </div>
  )
}

interface PostListProps {
  /** The posts to render, after search/tag filtering; newest-first. */
  posts: PostListItem[]
}

/**
 * The rendered list of post rows with client-side incremental reveal. Rendered
 * only when at least one post exists; when the active filter matches nothing it
 * shows the plain-text no-match state instead (distinct from the "no posts
 * exist" wording above).
 */
function PostList({ posts }: PostListProps) {
  const { visibleCount, sentinelRef } = useIncrementalReveal(
    posts.length,
    REVEAL_STEP,
  )

  if (posts.length === 0) {
    return <p className={styles.empty}>No posts match your search.</p>
  }

  return (
    <>
      <ul className={styles.list} aria-label="Blog posts">
        {posts.slice(0, visibleCount).map(({ slug, frontmatter }) => (
          <li key={slug} className={styles.row}>
            <time className={styles.date} dateTime={isoDate(frontmatter.date)}>
              {isoDate(frontmatter.date)}
            </time>
            <Link
              to="/blog/$slug"
              params={{ slug }}
              className={styles.postTitle}
            >
              {frontmatter.title}
            </Link>
            <div className={styles.summary}>
              <span className={styles.description}>
                {frontmatter.description}
              </span>
              <PostTags tags={frontmatter.tags} />
            </div>
          </li>
        ))}
      </ul>
      {/* Sentinel: when scrolled into view it reveals the next batch. Only
          rendered while rows remain hidden. */}
      {visibleCount < posts.length ? (
        <div ref={sentinelRef} aria-hidden="true" />
      ) : null}
    </>
  )
}
