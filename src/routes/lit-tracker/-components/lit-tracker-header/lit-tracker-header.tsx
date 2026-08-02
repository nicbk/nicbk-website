import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '~/routes/-shared/components/theme-toggle/theme-toggle'
import type { BreadcrumbAccount } from './breadcrumb'
import { rootBreadcrumbSegment } from './breadcrumb'
import styles from './lit-tracker-header.module.css'

interface LitTrackerHeaderProps {
  /** The signed-in account, for the breadcrumb's root segment. */
  account: BreadcrumbAccount
}

/**
 * The Lit Tracker's own header: app name on the left, the breadcrumb path
 * beside it, and the theme toggle at the far end
 * (research/ui-ux/pages/lit-tracker/components/header.md).
 *
 * A separate component from the site header rather than a variant of it, as
 * that spec requires — each sub-application gets its own. The two are not
 * parameterizations of one thing: the site header is `position: sticky` on a
 * normally-scrolling page, while this one is the fixed top edge of an app
 * shell and never scrolls at all. That difference lives in LitTrackerShell,
 * which owns the layout; this component owns the row's contents.
 *
 * The *arrangement*, though, deliberately mirrors the site header's — name,
 * then links, then the theme toggle pushed to the far end — so the two headers
 * read as the same site rather than as two products. The theme toggle is the
 * same component, not a copy: without it here the tracker would be the one
 * place on the site with no way to change theme, since it does not use the
 * site-wide header.
 *
 * The account control is **not** here. It lives at the foot of the sidebar
 * (LitTrackerSidebar), where the sample mockup puts it.
 *
 * Only the root segment of the breadcrumb is rendered. Article detail (#9)
 * grows it one segment per citation-graph hop, at which point the segments
 * become a prop; there is nothing yet that could supply a second one.
 */
export function LitTrackerHeader({ account }: LitTrackerHeaderProps) {
  return (
    <header className={styles.header}>
      {/* The app name is the tracker's home link, matching the site header's
          site-name-goes-home pattern. */}
      <Link to="/lit-tracker" className={styles.appName}>
        Literature Tracker
      </Link>

      {/* A single-item path today, but a path all the same: marking it up as a
          navigation landmark with a list is what lets #9 add hops without
          re-deciding the semantics. Each segment is a link back to that point
          in the path — which on the collection view means back to here. `↳`
          and `/` are decoration around the one real word, so they are hidden
          from assistive tech. */}
      <nav aria-label="Collection path" className={styles.breadcrumb}>
        <ol className={styles.breadcrumbList}>
          <li>
            <span aria-hidden="true">↳/</span>
            <Link to="/lit-tracker" className={styles.breadcrumbLink}>
              {rootBreadcrumbSegment(account)}
            </Link>
          </li>
        </ol>
      </nav>

      <ThemeToggle />
    </header>
  )
}
