import { Link } from '@tanstack/react-router'
import styles from './not-found-page.module.css'

/**
 * The site-wide 404 page, rendered inside SiteShell by the root route's
 * notFoundComponent (__root.tsx) for any unmatched route. Plain-text and
 * lowercase to match the minimalist home/about style — no numeric "404"
 * (per research/ui-ux/pages/site-wide/pages/not-found.md). The <h1> doubles
 * as the focus-handoff target (src/focus-handoff.ts) and skip-link landing
 * heading.
 */
export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>page not found</h1>
      <p className={styles.line}>
        <Link to="/">back to home</Link>
      </p>
    </div>
  )
}
