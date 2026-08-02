import type { AvatarAccount } from '../account-avatar/account-avatar'
import { AccountAvatar } from '../account-avatar/account-avatar'
import styles from './lit-tracker-sidebar.module.css'

interface LitTrackerSidebarProps {
  /** The signed-in account, for the avatar at the foot of the rail. */
  account: AvatarAccount
  /** Called once the session ends, so the guarded page can leave. */
  onSignedOut?: (() => void) | undefined
  /** Called once the account is deleted. */
  onDeleted?: (() => void) | undefined
}

/**
 * The Lit Tracker's left rail: an independently scrolling panel beside the
 * content, with the account avatar pinned to its foot — the arrangement in
 * research/ui-ux/sample-mockups/literature-tracker-sample.png.
 *
 * It is deliberately near-empty today. What fills the space above the avatar is
 * the tag and reading-status filter list, which belongs to #8
 * (research/ui-ux/pages/lit-tracker/pages/collection-view.md); this task builds
 * the rail so the app shell has both of its panels and the account control has
 * the home the design gives it. Because the rail sizes to its contents, that
 * reads today as a slim strip holding one control rather than as a wide empty
 * column — and it widens on its own when #8 puts filters in it, with no change
 * here.
 *
 * Not a `<nav>`: there is nothing to navigate in it yet, and naming an empty
 * landmark would announce a navigation region with no links in it. #8 marks up
 * the filter list it adds.
 */
export function LitTrackerSidebar({
  account,
  onSignedOut,
  onDeleted,
}: LitTrackerSidebarProps) {
  return (
    <div className={styles.sidebar}>
      {/* The filters #8 adds go here, above the account control, and scroll
          independently of it. */}
      <div className={styles.filters} />

      <div className={styles.account}>
        <AccountAvatar
          account={account}
          onSignedOut={onSignedOut}
          onDeleted={onDeleted}
        />
      </div>
    </div>
  )
}
