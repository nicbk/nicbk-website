import { Link } from '@tanstack/react-router'
import { UserSettings } from '~/routes/-shared/components/user-settings/user-settings'
import type { HeaderAccount } from './identity'
import { avatarInitial, rootBreadcrumbSegment } from './identity'
import styles from './lit-tracker-header.module.css'

interface LitTrackerHeaderProps {
  /** The signed-in account, from the route guard's session. */
  account: HeaderAccount
  /** Called once the session ends, so the guarded page can leave. */
  onSignedOut?: (() => void) | undefined
  /** Called once the account is deleted. */
  onDeleted?: (() => void) | undefined
}

/**
 * The Lit Tracker's own header: app name on the left, the breadcrumb path
 * indicator beside it, and the account avatar at the far right
 * (research/ui-ux/pages/lit-tracker/components/header.md).
 *
 * A separate component from the site header rather than a variant of it, as
 * that spec requires — each sub-application gets its own. The two are not
 * parameterizations of one thing: the site header is `position: sticky` on a
 * normally-scrolling page, while this one is the fixed top edge of an app
 * shell and never scrolls at all. That difference lives in LitTrackerShell,
 * which owns the layout; this component owns the row's contents.
 *
 * The avatar is the first live trigger for the shared user-settings modal,
 * which #6 built and shipped with nothing to open it. It is that modal, not a
 * lit-tracker-specific copy — account settings are a site concept.
 *
 * Only the root segment of the breadcrumb is rendered here. Article detail
 * (#9) grows it one segment per citation-graph hop, at which point the segments
 * become a prop; there is nothing yet that could supply a second one.
 */
export function LitTrackerHeader({
  account,
  onSignedOut,
  onDeleted,
}: LitTrackerHeaderProps) {
  return (
    <header className={styles.header}>
      {/* The app name is the tracker's home link, matching the site header's
          site-name-goes-home pattern. */}
      <Link to="/lit-tracker" className={styles.appName}>
        Literature Tracker
      </Link>

      {/* A single-item path today, but a path all the same: marking it up as a
          navigation landmark with a list is what lets #9 add hops without
          re-deciding the semantics. `↳` and `/` are decoration around the one
          real word, so they are hidden from assistive tech. */}
      <nav aria-label="Collection path" className={styles.breadcrumb}>
        <ol className={styles.breadcrumbList}>
          <li>
            <span aria-hidden="true">↳/</span>
            {rootBreadcrumbSegment(account)}
          </li>
        </ol>
      </nav>

      <UserSettings
        email={account.email}
        triggerLabel="Account settings"
        triggerClassName={styles.avatar}
        onSignedOut={onSignedOut}
        onDeleted={onDeleted}
      >
        {/* The letter is decoration: the trigger is already named by
            triggerLabel, and announcing "N" after it would say nothing. */}
        <span aria-hidden="true">{avatarInitial(account)}</span>
      </UserSettings>
    </header>
  )
}
