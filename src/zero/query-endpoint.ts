import { mustGetQuery } from '@rocicorp/zero'
import { handleQueryRequest } from '@rocicorp/zero/server'
import type { AuthSession } from '~/auth/session'
import { hasValidApiKey } from './api-key'
import { zeroContextFrom } from './context'
import { queries } from './queries'
import { schema } from './schema.gen'

/** What the query endpoint needs from the application to answer a request. */
export interface ZeroQueryEndpointDependencies {
  /** The key zero-cache is configured to present. */
  apiKey: string
  /** Resolves the session for a request, validated against the database. */
  getSession: (request: Request) => Promise<AuthSession>
}

/**
 * Answers zero-cache's request to resolve queries — the authorization boundary
 * for every piece of user-owned data on this site.
 *
 * zero-cache does not let clients send it queries. It sends this endpoint a
 * query's *name and arguments*, and gets back the ZQL to run. So what a client
 * can read is decided here, by code holding the session, and nowhere else: Zero
 * has no row-level-security layer behind it
 * (research/system-architecture/data-sharing-boundaries.md).
 *
 * Two independent checks, in order. The API key proves the caller is
 * zero-cache, which matters because this route is reachable on the public app
 * server; it says nothing about *whose* data may be read. The session decides
 * that, and a request without one is answered 401 — which puts the client into
 * Zero's `needs-auth` state so it can re-authenticate, rather than quietly
 * syncing an empty collection that would look like data loss. (The queries
 * themselves also return nothing without a context; see `queries.ts`.)
 *
 * Separate from the route that mounts it so it can be tested against fabricated
 * requests and sessions instead of the application's own singletons.
 */
export async function respondToZeroQuery(
  request: Request,
  { apiKey, getSession }: ZeroQueryEndpointDependencies,
): Promise<Response> {
  if (!hasValidApiKey(request, apiKey)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const session = await getSession(request)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const ctx = zeroContextFrom(session)

  const result = await handleQueryRequest({
    handler: (name, args) => mustGetQuery(queries, name).fn({ args, ctx }),
    schema,
    request,
    // Server-verified, so Zero can enforce that only tabs belonging to this
    // user share a client group.
    userID: session.user.id,
  })

  return Response.json(result)
}
