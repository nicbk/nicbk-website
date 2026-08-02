import { mustGetMutator } from '@rocicorp/zero'
import { handleMutateRequest } from '@rocicorp/zero/server'
import type { AuthSession } from '~/auth/session'
import { hasValidApiKey } from './api-key'
import type { dbProvider } from './db-provider'
import { mutators } from './mutators'

/** What the mutate endpoint needs from the application to answer a request. */
export interface ZeroMutateEndpointDependencies {
  /** The key zero-cache is configured to present. */
  apiKey: string
  /** Resolves the session for a request, validated against the database. */
  getSession: (request: Request) => Promise<AuthSession>
  /** Runs mutators inside a Postgres transaction. */
  dbProvider: typeof dbProvider
}

/**
 * The write half of the same boundary — real, authorized, and currently
 * offering nothing to call.
 *
 * `mutators.ts` explains why the registry is empty: nothing in this feature
 * writes from the browser. What matters is that the endpoint is checked now
 * rather than when its first consumer arrives — an unauthenticated request is
 * refused here, and an unknown mutator name throws, so the seam the collection
 * view plugs into is one that has already been proven closed.
 */
export async function respondToZeroMutate(
  request: Request,
  { apiKey, getSession, dbProvider }: ZeroMutateEndpointDependencies,
): Promise<Response> {
  if (!hasValidApiKey(request, apiKey)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const session = await getSession(request)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await handleMutateRequest({
    dbProvider,
    // The registry is empty, so `mustGetMutator` throws for every name and this
    // callback never returns a mutation — TypeScript types it `never`, which is
    // why nothing is done with its result. The first task to register a mutator
    // turns this into `mustGetMutator(mutators, name).fn({args, tx, ctx})` and
    // derives `ctx` with `zeroContextFrom(session)`, exactly as `/query` does.
    handler: (transact) =>
      transact((_tx, name) => mustGetMutator(mutators, name)),
    request,
    userID: session.user.id,
  })

  return Response.json(result)
}
