import type { ReactNode } from 'react'
import styles from './header-row.module.css'

interface HeaderRowProps {
  /**
   * Where the row sits — the caller's layout model, not the row's.
   *
   * The site header is `position: sticky` on a page that scrolls as one unit;
   * the tracker's is the fixed top edge of an app shell whose document never
   * scrolls. That difference is decided and stays
   * (research/ui-ux/pages/site-wide/components/header.md), so positioning is
   * the one thing this component refuses to know about. A caller that needs
   * none — the tracker — passes nothing.
   */
  className?: string
  /** The row's items. The only thing that differs between the two headers. */
  children: ReactNode
}

/**
 * The header row both of this site's headers are made of.
 *
 * **Why it exists.** The personal site's header and the Lit Tracker's used to be
 * two separate implementations of the same row, each summing its own
 * `padding-block` with whatever its tallest item happened to be. They computed
 * to different heights — 58.59px and 57.00px, a difference the user could see and
 * reported — and the divergence was never decided: the tracker's padding is
 * smaller *because* its 32px avatar is taller, a compensation that landed 1.6px
 * from the row it was compensating towards. Nothing declared them equal and no
 * test held them there, so one control taller than a nav link would have pushed
 * them 8px apart with the suite still green.
 *
 * This is the fix for the class rather than the pixel: **the row's height is
 * declared once** (`header-row.module.css`), and the two headers are reduced to
 * what genuinely differs between them, which is their items.
 * (features/one-header-row — user-decided 2026-09-13, reversing the 2026-07-04
 * decision that the two be separate components. That decision was about
 * *identity*, and identity survives: the two still share not one item.)
 *
 * **It must never learn which header it is.** A `variant` prop or a `sticky`
 * boolean would mean the items had been merged instead of the row, which is the
 * convenient shape and therefore the likely mistake.
 *
 * The row class is applied here rather than composed in by each caller so that a
 * caller cannot forget it — the invariant this component exists to hold is that
 * every header on the site is this row.
 */
export function HeaderRow({ className, children }: HeaderRowProps) {
  return (
    <header className={className ? `${styles.row} ${className}` : styles.row}>
      {children}
    </header>
  )
}
