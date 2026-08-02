import type { ReactNode } from 'react'
import type { AvatarAccount } from '../account-avatar/account-avatar'
import { LitTrackerHeader } from '../lit-tracker-header/lit-tracker-header'
import { LitTrackerSidebar } from '../lit-tracker-sidebar/lit-tracker-sidebar'
import styles from './lit-tracker-shell.module.css'

interface LitTrackerShellProps {
  /** The signed-in account, for the sidebar's avatar. */
  account: AvatarAccount
  /** Called once the session ends, so the guarded page can leave. */
  onSignedOut?: (() => void) | undefined
  /** Called once the account is deleted. */
  onDeleted?: (() => void) | undefined
  children: ReactNode
}

/**
 * The Lit Tracker's app-shell chrome: the header pinned to the top edge of the
 * viewport, and below it two independently scrolling panels — the sidebar rail
 * and the content.
 *
 * This is the layout model the header spec calls for and the thing that most
 * distinguishes the tracker from the personal site
 * (research/ui-ux/pages/lit-tracker/components/header.md). SiteShell puts a
 * `position: sticky` header on a page that scrolls as one unit; here the
 * document does not scroll at all — the shell is exactly one viewport tall and
 * the panels inside it are what move. Every later tracker page inherits this:
 * #8's article grid scrolls independently of the filter list in the rail, and
 * #9's reader scrolls independently of its own sidebar.
 *
 * The `<main id="main-content" tabIndex={-1}>` is the same landmark SiteShell
 * renders, and for the same two reasons: the skip link (__root.tsx) targets it,
 * and the route-change focus handoff (src/focus-handoff.ts) lands on the page's
 * `<h1>` inside it or on the landmark itself. Duplicating the element rather
 * than reusing SiteShell is deliberate — what differs between the two shells is
 * precisely the layout wrapped around it.
 */
export function LitTrackerShell({
  account,
  onSignedOut,
  onDeleted,
  children,
}: LitTrackerShellProps) {
  return (
    <div className={styles.shell}>
      <LitTrackerHeader />
      <div className={styles.panels}>
        <LitTrackerSidebar
          account={account}
          onSignedOut={onSignedOut}
          onDeleted={onDeleted}
        />
        <main id="main-content" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
