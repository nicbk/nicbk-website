import { ArticleSidebar } from './article-sidebar'
import styles from './article-rail.module.css'

interface ArticleRailProps {
  articleId: string
  /**
   * Names the region. Passed in for the same reason the filter rail's label is:
   * what a reader navigating by landmark should hear is a property of the page
   * the rail belongs to, not of the rail.
   */
  label: string
}

/**
 * The article's sidebar as it sits in the shell rail, beside the reader.
 *
 * `<aside>` rather than the filter rail's `<nav>`: nothing in here navigates.
 * These are controls and a text field about the page you are already on, which
 * is what a complementary landmark is for.
 *
 * Below the responsive breakpoint this slot is hidden outright and the summary
 * row's sheet shows the same sidebar instead. `display: none` rather than visual
 * hiding, exactly as the filter rail does it: the contents must leave the
 * accessibility tree too, or a screen-reader user would meet both copies with no
 * way to tell which one the sighted layout is using.
 */
export function ArticleRail({ articleId, label }: ArticleRailProps) {
  return (
    <aside className={styles.rail} aria-label={label}>
      <ArticleSidebar articleId={articleId} />
    </aside>
  )
}
