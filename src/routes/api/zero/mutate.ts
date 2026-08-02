import { createFileRoute } from '@tanstack/react-router'
import { getSession } from '~/auth/auth'
import { env } from '~/env'
import { dbProvider } from '~/zero/db-provider'
import { respondToZeroMutate } from '~/zero/mutate-endpoint'

/**
 * Mounts the mutate endpoint zero-cache calls to push writes.
 *
 * The URL is what `ZERO_MUTATE_URL` points at in docker-compose.yml. Real and
 * authorized, with an empty mutator registry behind it — see
 * `respondToZeroMutate` and `~/zero/mutators` for why that is deliberate.
 */
export const Route = createFileRoute('/api/zero/mutate')({
  server: {
    handlers: {
      POST: ({ request }) =>
        respondToZeroMutate(request, {
          apiKey: env.ZERO_MUTATE_API_KEY,
          getSession,
          dbProvider,
        }),
    },
  },
})
