import { describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '~/auth/session'
import { respondToZeroQuery } from './query-endpoint'

const API_KEY = 'zero-cache-query-key-long-enough-to-be-real'

function sessionFor(userId: string): AuthSession {
  return { user: { id: userId } } as unknown as AuthSession
}

/**
 * A request in the shape zero-cache sends: a `transform` message carrying the
 * queries to resolve, each with an id, a name, and its arguments.
 *
 * The tuple wrapper is Zero's own wire protocol
 * (`transformRequestMessageSchema`), read off the installed package rather than
 * its docs, which describe the bare array this used to be.
 */
function queryRequest(
  queries: { id: string; name: string; args: unknown[] }[],
  headers: Record<string, string> = { 'X-Api-Key': API_KEY },
): Request {
  return new Request('https://nicbk.com/api/zero/query', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(['transform', queries]),
  })
}

const MINE = [{ id: 'q1', name: 'articles.mine', args: [] }]

describe('respondToZeroQuery', () => {
  it('resolves a query to ZQL scoped to the session user', async () => {
    const response = await respondToZeroQuery(queryRequest(MINE), {
      apiKey: API_KEY,
      getSession: async () => sessionFor('user-a'),
    })

    expect(response.status).toBe(200)
    // The user id in the answer comes from the session, and is the whole point:
    // this is the filter zero-cache will run against the replica.
    expect(JSON.stringify(await response.json())).toContain('user-a')
  })

  it('refuses a caller that is not zero-cache', async () => {
    const getSession = vi.fn(async () => sessionFor('user-a'))

    const response = await respondToZeroQuery(
      queryRequest(MINE, { 'X-Api-Key': 'wrong-key-of-a-different-length' }),
      { apiKey: API_KEY, getSession },
    )

    expect(response.status).toBe(403)
    // Rejected before the session is even read: a bad key is not a question
    // about who the user is.
    expect(getSession).not.toHaveBeenCalled()
  })

  it('refuses a request carrying no valid session', async () => {
    const response = await respondToZeroQuery(queryRequest(MINE), {
      apiKey: API_KEY,
      getSession: async () => null,
    })

    // 401 rather than an empty result: it puts the client into Zero's
    // `needs-auth` state so it can re-authenticate, instead of syncing an empty
    // collection that would look like the user's data had vanished.
    expect(response.status).toBe(401)
  })

  it('reads the session from the request zero-cache forwarded', async () => {
    // zero-cache forwards the browser's cookies, so the session must be
    // resolved from *this* request rather than from ambient state.
    const getSession = vi.fn(async () => sessionFor('user-a'))
    const request = queryRequest(MINE)

    await respondToZeroQuery(request, { apiKey: API_KEY, getSession })

    expect(getSession).toHaveBeenCalledWith(request)
  })

  it('reports an unknown query name as an error rather than answering it', async () => {
    const response = await respondToZeroQuery(
      queryRequest([{ id: 'q1', name: 'articles.everything', args: [] }]),
      { apiKey: API_KEY, getSession: async () => sessionFor('user-a') },
    )

    // A name that is not in the registry cannot be resolved to ZQL, so there is
    // no way for a client to invent a query that was never reviewed.
    expect(JSON.stringify(await response.json())).toContain('error')
  })
})
