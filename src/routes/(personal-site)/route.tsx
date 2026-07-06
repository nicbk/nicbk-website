import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SiteHeader } from './-components/site-header/site-header'

/**
 * Layout for the (personal-site) route group: every personal-site page
 * renders inside the sticky site header, with page content in the <main>
 * landmark the skip link (__root.tsx) and route-change focus handoff
 * (src/focus-handoff.ts) both target.
 */
export const Route = createFileRoute('/(personal-site)')({
  component: PersonalSiteLayout,
})

function PersonalSiteLayout() {
  return (
    <>
      <SiteHeader />
      {/* tabIndex={-1} makes the landmark programmatically focusable for
          the skip link and as the focus-handoff fallback. */}
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  )
}
