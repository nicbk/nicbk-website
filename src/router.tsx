import { createRouter } from '@tanstack/react-router'
import { focusPageHeading } from './focus-handoff'
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

  // Client only: after each real client-side navigation (not the initial
  // hydration, which has no fromLocation), hand focus to the new page's
  // heading — see src/focus-handoff.ts.
  if (typeof document !== 'undefined') {
    router.subscribe('onResolved', ({ fromLocation, toLocation }) => {
      if (fromLocation && fromLocation.href !== toLocation.href) {
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
