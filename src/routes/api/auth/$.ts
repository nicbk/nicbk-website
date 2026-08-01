import { createFileRoute } from '@tanstack/react-router'
import { auth } from '~/auth/auth'

/**
 * Better Auth's HTTP surface, mounted in-process at `/api/auth/*` rather than
 * run as a separate service — the single-app-server topology decided in
 * research/system-architecture/service-topology.md.
 *
 * The catch-all segment matters: Better Auth serves many endpoints under this
 * prefix (the Google sign-in redirect, its OAuth callback, session reads, sign
 * out, account deletion), and its own router dispatches among them from the
 * full request. GET and POST are the only methods it uses.
 */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
