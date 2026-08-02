import type { ReactNode } from 'react'
import type { HeaderAccount } from '../lit-tracker-header/identity'
import { LitTrackerHeader } from '../lit-tracker-header/lit-tracker-header'
import styles from './lit-tracker-shell.module.css'

interface LitTrackerShellProps {
  /** The signed-in account, for the header's breadcrumb and avatar. */
  account: HeaderAccount
  /** Called once the session ends, so the guarded page can leave. */
  onSignedOut?: (() => void) | undefined
  /** Called once the account is deleted. */
  onDeleted?: (() => void) | undefined
  children: ReactNode
}

/**
 * The Lit Tracker's app-shell chrome: the header pinned to the top edge of the
 * viewport, and a bounded panel below it that scrolls on its own.
 *
 * This is the layout model the header spec calls for and the thing that most
 * distinguishes the tracker from the personal site
 * (research/ui-ux/pages/lit-tracker/components/header.md). SiteShell puts a
 * `position: sticky` header on a page that scrolls as one unit; here the
 * document does not scroll at all — the shell is exactly one viewport tall and
 * the content panel inside it is what moves. Every later tracker page inherits
 * this: the collection's article grid scrolls independently of its filter
 * sidebar (#8), and article detail's reader scrolls independently of its
 * sidebar (#9). Both are extra panels beside this one, not a different shell.
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
      <LitTrackerHeader
        account={account}
        onSignedOut={onSignedOut}
        onDeleted={onDeleted}
      />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
