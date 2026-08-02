import { createFileRoute } from '@tanstack/react-router'
import { getSession } from '~/auth/auth'
import { env } from '~/env'
import { respondToZeroQuery } from '~/zero/query-endpoint'

/**
 * Mounts the query endpoint zero-cache calls to resolve every synced query.
 *
 * The URL is what `ZERO_QUERY_URL` points at in docker-compose.yml. All the
 * behavior — and the authorization that makes this the boundary for user data —
 * lives in `respondToZeroQuery`; this file only supplies the application's own
 * session reader and configured key.
 */
export const Route = createFileRoute('/api/zero/query')({
  server: {
    handlers: {
      POST: ({ request }) =>
        respondToZeroQuery(request, {
          apiKey: env.ZERO_QUERY_API_KEY,
          getSession,
        }),
    },
  },
})
