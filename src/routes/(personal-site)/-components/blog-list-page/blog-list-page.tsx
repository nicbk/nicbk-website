import { Link } from '@tanstack/react-router'
import { isoDate } from '../../-utils/format-date'
import { useIncrementalReveal } from '../../-utils/use-incremental-reveal'
import { PostTags } from '../post-tags/post-tags'
import styles from './blog-list-page.module.css'
import { type PostListItem } from '~blog/posts'

interface BlogListPageProps {
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
 * high-level-guidance/design/blog-page.png. Each row is date / title /
 * description with tags inline after the description, and the columns line up
 * down the page via a CSS grid (see the module stylesheet). Ordering and
 * draft-exclusion happen upstream in the route loader (`-lib/load-listing.ts`);
 * this component only renders what it is given.
 */
export function BlogListPage({ posts }: BlogListPageProps) {
  const { visibleCount, sentinelRef } = useIncrementalReveal(
    posts.length,
    REVEAL_STEP,
  )

  return (
    <div className={styles.page}>
      {/* The page's single visible <h1> and the route-change focus-handoff
          target (src/focus-handoff.ts). */}
      <h1 className={styles.title}>blog</h1>

      {posts.length === 0 ? (
        // Empty state: plain inline text, no spinner/illustration (the design
        // system's reactive-feedback default).
        <p className={styles.empty}>No posts yet.</p>
      ) : (
        <>
          <ul className={styles.list} aria-label="Blog posts">
            {posts.slice(0, visibleCount).map(({ slug, frontmatter }) => (
              <li key={slug} className={styles.row}>
                <time
                  className={styles.date}
                  dateTime={isoDate(frontmatter.date)}
                >
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
      )}
    </div>
  )
}
