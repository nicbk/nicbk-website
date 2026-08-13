import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ThemeToggle } from '~/routes/-shared/components/theme-toggle/theme-toggle'
import type { AvatarAccount } from '../account-avatar/account-avatar'
import { AccountAvatar } from '../account-avatar/account-avatar'
import styles from './lit-tracker-header.module.css'

/**
 * The path's root segment — the personal site this sub-application is hosted
 * on, not the signed-in reader.
 *
 * Literal and identical for every account: `nicbk` is the site owner, the same
 * name the site header spells out as "Nicolás Kennedy". It is not derived from
 * whoever is signed in.
 */
const SITE_ROOT_SEGMENT = 'nicbk_home'

interface LitTrackerHeaderProps {
  /** The signed-in account, for the avatar that opens the settings modal. */
  account: AvatarAccount
  /** Called once the session ends, so the guarded page can leave. */
  onSignedOut?: (() => void) | undefined
  /** Called once the account is deleted. */
  onDeleted?: (() => void) | undefined
  /**
   * Where the reader is inside the tracker — the article being read.
   *
   * Taken as an element so this component stays chrome: it owns the row, not
   * the question of which article any page is showing.
   */
  pageTitle?: ReactNode
}

/**
 * The Lit Tracker's own header: app name and the open article on the left, and
 * on the right the path, the account control and the theme toggle
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
 *    the path — where this sub-application is hosted, not where you are in it.
 *
 * **The article's title lives in this row rather than over the reader**
 * (user-decided 2026-08-13). It began as a metadata header above the document,
 * and that header cost roughly a fifth of the panel's height to say three things
 * — on the one page whose entire purpose is showing as much of a paper as
 * possible. So the title came up here and the row went away.
 *
 * **It sits beside the app name, not in the path** (user-decided 2026-08-13,
 * after seeing both). The decided spec put it in the breadcrumb, and there it
 * read as ambiguous: `↳/nicbk_home/Attention Is All You Need` is a path from the
 * *site's* root, so a paper's title arriving at the end of it looked like a
 * location on the personal site rather than the thing being read. Beside the app
 * name, separated by a rule, it reads as what it is — the tracker, then the
 * article open in it. `header.md`'s revision records the change and what it
 * leaves #10 to decide about citation-graph hops.
 *
 * **The account control sits between the path and the toggle.** It began here,
 * moved to the foot of the sidebar when #7 read the mockup's bottom-left avatar
 * as its home, and came back at the user's request while #8's filter rail was
 * being built (2026-08-09): a single avatar alone at the bottom of a rail full
 * of tags is an odd place for it, and the header is where every other
 * account-level control on the site already lives. It opens the same shared
 * settings modal wherever it sits.
 */
export function LitTrackerHeader({
  account,
  onSignedOut,
  onDeleted,
  pageTitle,
}: LitTrackerHeaderProps) {
  return (
    <header className={styles.header}>
      <Link to="/lit-tracker" className={styles.appName}>
        Literature Tracker
      </Link>

      {/* Where you are inside the tracker, beside what you are inside. The rule
          separates the app's name from the page's, so the two do not read as one
          run-on title. */}
      {pageTitle !== undefined && (
        <>
          <span className={styles.divider} aria-hidden="true" />
          <div className={styles.pageTitle}>{pageTitle}</div>
        </>
      )}

      {/* `↳` and `/` are decoration around the one real word, so they are hidden
          from assistive tech. */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol className={styles.breadcrumbList}>
          <li className={styles.rootSegment}>
            <span aria-hidden="true">↳/</span>
            <Link to="/" className={styles.breadcrumbLink}>
              {SITE_ROOT_SEGMENT}
            </Link>
          </li>
        </ol>
      </nav>

      <AccountAvatar
        account={account}
        onSignedOut={onSignedOut}
        onDeleted={onDeleted}
      />

      <ThemeToggle />
    </header>
  )
}
