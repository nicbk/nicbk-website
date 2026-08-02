import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '~/routes/-shared/components/theme-toggle/theme-toggle'
import styles from './lit-tracker-header.module.css'

/**
 * The breadcrumb's root segment — the personal site this sub-application is
 * hosted on, not the signed-in reader.
 *
 * Literal and identical for every account: `nicbk` is the site owner, the same
 * name the site header spells out as "Nicolás Kennedy". It is not derived from
 * whoever is signed in.
 */
const SITE_ROOT_SEGMENT = 'nicbk_home'

/**
 * The Lit Tracker's own header: app name on the left, and on the right the
 * breadcrumb path followed by the theme toggle
 * (research/ui-ux/pages/lit-tracker/components/header.md).
 *
 * A separate component from the site header rather than a variant of it, as
 * that spec requires — each sub-application gets its own. The two are not
 * parameterizations of one thing: the site header is `position: sticky` on a
 * normally-scrolling page, while this one is the fixed top edge of an app
 * shell and never scrolls at all. That difference lives in LitTrackerShell,
 * which owns the layout; this component owns the row's contents.
 *
 * The *arrangement*, though, deliberately mirrors the site header's — a name on
 * one side, links and the theme toggle on the other — so the two headers read
 * as the same site rather than as two products. The toggle is the same
 * component, not a copy: without it here the tracker would be the one place on
 * the site with no way to change theme, since it does not use the site-wide
 * header.
 *
 * Two links, two destinations, and they are not the same one:
 *
 *  - **Literature Tracker** goes to the tracker's own root — the
 *    site-name-goes-home pattern, scoped to this sub-application.
 *  - **`↳/nicbk_home`** goes to the *personal site's* home. It is the root of
 *    the path, which is why article detail (#9) grows it one segment per
 *    citation-graph hop into `↳/nicbk_home/Article A/Article B`.
 *
 * The account control is **not** here. It lives at the foot of the sidebar
 * (LitTrackerSidebar), where the sample mockup puts it.
 */
export function LitTrackerHeader() {
  return (
    <header className={styles.header}>
      <Link to="/lit-tracker" className={styles.appName}>
        Literature Tracker
      </Link>

      {/* A single-item path today, but a path all the same: marking it up as a
          navigation landmark with a list is what lets #9 add hops without
          re-deciding the semantics. `↳` and `/` are decoration around the one
          real word, so they are hidden from assistive tech. */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol className={styles.breadcrumbList}>
          <li>
            <span aria-hidden="true">↳/</span>
            <Link to="/" className={styles.breadcrumbLink}>
              {SITE_ROOT_SEGMENT}
            </Link>
          </li>
        </ol>
      </nav>

      <ThemeToggle />
    </header>
  )
}
