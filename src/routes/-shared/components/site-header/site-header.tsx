import { Link } from '@tanstack/react-router'
import { HeaderRow } from '~/routes/-shared/components/header-row/header-row'
import { ThemeToggle } from '~/routes/-shared/components/theme-toggle/theme-toggle'
import styles from './site-header.module.css'

/**
 * The sticky site header every personal-site page renders under: bold site
 * name linking home, projects/blog/about nav in the same single row (no
 * hamburger at any width), thin divider below. Deliberately no auth UI and
 * no active-page indication — see
 * research/ui-ux/pages/site-wide/components/header.md. The theme toggle
 * lives at the row's far end (the theming decision places it on the
 * site-wide header surface).
 *
 * **The row is shared with the tracker's header and these items are not**
 * (header-row.tsx, user-decided 2026-09-13). This component is now the list of
 * things in the row plus where the row sits; it declares nothing about the row
 * itself, which is why the two headers can no longer end up different heights.
 */
export function SiteHeader() {
  return (
    <HeaderRow className={styles.header}>
      <Link to="/" className={styles.siteName}>
        Nicolás Kennedy
      </Link>
      <nav aria-label="Site" className={styles.nav}>
        <Link to="/projects" className={styles.navLink}>
          projects
        </Link>
        <Link to="/blog" className={styles.navLink}>
          blog
        </Link>
        <Link to="/about" className={styles.navLink}>
          about
        </Link>
      </nav>
      <ThemeToggle />
    </HeaderRow>
  )
}
