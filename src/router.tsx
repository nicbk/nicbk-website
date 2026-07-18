import { createRouter } from '@tanstack/react-router'
import { focusPageHeading, isPageNavigation } from './focus-handoff'
import { routeTree } from './routeTree.gen'

/**
 * Called by TanStack Start to create a router instance per request (server)
 * and once on the client.
 */
export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  })

  // Client only: after each real client-side navigation to a different page,
  // hand focus to the new page's heading. `isPageNavigation` keys the decision
  // on the pathname (not the full href) so same-page search-param updates — the
  // blog's live search and tag filters — leave focus on the control the reader
  // is using. See src/focus-handoff.ts.
  if (typeof document !== 'undefined') {
    router.subscribe('onResolved', ({ fromLocation, toLocation }) => {
      if (isPageNavigation(fromLocation, toLocation)) {
        focusPageHeading()
      }
    })
  }

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
