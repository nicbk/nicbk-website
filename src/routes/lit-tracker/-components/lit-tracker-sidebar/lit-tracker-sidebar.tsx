import type { ReactNode } from 'react'
import styles from './lit-tracker-sidebar.module.css'

interface LitTrackerSidebarProps {
  /**
   * The filter list. Absent before the first sync, and on narrow screens where
   * the filters move into a drawer instead.
   */
  filters?: ReactNode
}

/**
 * The Lit Tracker's left rail: an independently scrolling panel beside the
 * content, holding the collection's filters.
 *
 * #7 built it near-empty and #8's third task filled it, exactly as planned:
 * because the rail sizes to its contents, the filters widened it with no change
 * to the shell around it.
 *
 * **The account avatar used to be pinned to its foot** — that is where the
 * sample mockup draws it — and it moved to the header at the user's request
 * (2026-08-09), once the rail had a real tag list in it: one avatar alone under
 * thirty tags reads as the last item of the list rather than as the account
 * control, and the header is where the rest of the site keeps account-level
 * controls. What is left here is one thing, which is why the rail no longer
 * splits into two regions.
 *
 * Still not a `<nav>` itself: the filter list names its own landmark
 * (`FilterRail`), and wrapping it in a second one would announce a navigation
 * region inside a navigation region.
 */
export function LitTrackerSidebar({ filters }: LitTrackerSidebarProps) {
  return <div className={styles.sidebar}>{filters}</div>
}
