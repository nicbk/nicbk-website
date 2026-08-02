import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { requireAuth } from '~/auth/require-auth'
import { LitTrackerShell } from './-components/lit-tracker-shell/lit-tracker-shell'
import { TrackerLoading } from './-components/tracker-loading/tracker-loading'
import { ZeroClientProvider } from './-components/zero-client/zero-client-provider'

/**
 * Layout for `/lit-tracker` — the Lit Tracker's own route group, and the first
 * protected area of this site.
 *
 * A top-level group rather than part of `(personal-site)`: the tracker uses a
 * different shell entirely (a fixed app shell, not a sticky header on a
 * scrolling page) and a different header component, so there is nothing for the
 * two to share beyond the design tokens
 * (research/ui-ux/pages/lit-tracker/components/header.md).
 *
 * `requireAuth` is attached here, at the group root, so every present and
 * future tracker route inherits it rather than each one remembering to. This is
 * the guard's first attachment to a page a visitor can reach: #6 built and
 * tested it with no protected route to put it on. A signed-out visitor is
 * redirected straight to `/sign-in` carrying the URL they asked for, with no
 * access-denied interstitial (research/ui-ux/pages/index.md).
 *
 * Everything below the shell is inside the Zero provider, so any tracker page
 * can call `useQuery` without mounting its own client — and so there is exactly
 * one WebSocket to zero-cache per session, not one per page.
 */
export const Route = createFileRoute('/lit-tracker')({
  beforeLoad: async (context) => ({ auth: await requireAuth(context) }),
  component: LitTrackerLayout,
})

function LitTrackerLayout() {
  const { auth } = Route.useRouteContext()
  const navigate = useNavigate()

  // Logging out or deleting the account leaves nothing signed in, and this page
  // requires a session — so leave for the public site rather than sit on a
  // guarded page whose session no longer exists.
  const leave = () => void navigate({ to: '/' })

  return (
    <LitTrackerShell account={auth.user} onSignedOut={leave} onDeleted={leave}>
      {/* Zero has no SSR, so nothing under this provider exists until the
          browser has hydrated — including the page's own heading. The
          placeholder is what the reader sees until then, and the same one each
          page shows while its first sync is still in flight. */}
      <ZeroClientProvider userId={auth.user.id} fallback={<TrackerLoading />}>
        <Outlet />
      </ZeroClientProvider>
    </LitTrackerShell>
  )
}
