import { type ReactNode } from 'react'
import { SiteHeader } from '~/routes/-shared/components/site-header/site-header'
import styles from './site-shell.module.css'

interface SiteShellProps {
  children: ReactNode
}

/**
 * Shared site chrome: the sticky site header plus the
 * <main id="main-content" tabIndex={-1}> landmark that wraps page content.
 *
 * This is the single definition of that header + <main> wrapper. The
 * personal-site layout ((personal-site)/route.tsx) and the root-level
 * fallback pages (the 404 in __root.tsx's notFoundComponent, and the error
 * page) all render through it, so the header and the focusable landmark are
 * never duplicated. The landmark carries tabIndex={-1} so it is the
 * programmatic focus target for the skip link (src/routes/-shared/components/
 * skip-link) and the route-change focus handoff (src/focus-handoff.ts).
 */
export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </>
  )
}
