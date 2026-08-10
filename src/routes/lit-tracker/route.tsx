import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { requireAuth } from '~/auth/require-auth'
import { FilterRail } from './-collection-filters/filter-rail'
import { collectionSearchSchema } from './-collection-filters/search-schema'
import { LitTrackerShell } from './-components/lit-tracker-shell/lit-tracker-shell'

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
 * The shell mounts the Zero provider around both of its panels, so any tracker
 * page — and the filter rail beside it — can call `useQuery` without mounting
 * its own client, and there is exactly one WebSocket to zero-cache per session.
 *
 * **The collection's filters are validated here, at the group root**, rather
 * than on the collection page. The rail that sets them renders in the shell's
 * sidebar, outside the page, so page-level search params would be unreadable
 * from the control that writes them; one level up, the rail and the page share
 * one route API. It also means a filtered collection is still filtered after
 * following a card into an article and coming back.
 */
export const Route = createFileRoute('/lit-tracker')({
  validateSearch: collectionSearchSchema,
  beforeLoad: async (context) => ({ auth: await requireAuth(context) }),
  component: LitTrackerLayout,
})

/**
 * What the rail announces itself as. "filters" alone would be ambiguous once
 * #9's reader has a sidebar of its own; this says what is being filtered.
 */
const FILTER_RAIL_LABEL = 'filter collection'

function LitTrackerLayout() {
  const { auth } = Route.useRouteContext()
  const navigate = useNavigate()

  // Logging out or deleting the account leaves nothing signed in, and this page
  // requires a session — so leave for the public site rather than sit on a
  // guarded page whose session no longer exists.
  const leave = () => void navigate({ to: '/' })

  return (
    <LitTrackerShell
      account={auth.user}
      onSignedOut={leave}
      onDeleted={leave}
      // An element, not a rendered tree: the shell renders it inside the Zero
      // provider, which is where its queries need to run. Named here rather than
      // inside the shell so the shell stays chrome with no page-specific
      // contents compiled into it.
      filters={<FilterRail label={FILTER_RAIL_LABEL} />}
    >
      <Outlet />
    </LitTrackerShell>
  )
}
