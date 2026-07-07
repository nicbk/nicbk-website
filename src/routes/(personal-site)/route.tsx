import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SiteShell } from '~/routes/-shared/components/site-shell/site-shell'

/**
 * Layout for the (personal-site) route group: every personal-site page
 * renders inside the shared SiteShell — the sticky site header plus the
 * <main> landmark the skip link (__root.tsx) and route-change focus handoff
 * (src/focus-handoff.ts) both target. The shell is shared with the
 * root-level fallback pages so this wrapper is defined exactly once.
 */
export const Route = createFileRoute('/(personal-site)')({
  component: PersonalSiteLayout,
})

// Exported for the output-neutral regression test (route.test.tsx), which
// renders it directly to assert the header + focusable <main> survive the
// SiteShell refactor.
export function PersonalSiteLayout() {
  return (
    <SiteShell>
      <Outlet />
    </SiteShell>
  )
}
