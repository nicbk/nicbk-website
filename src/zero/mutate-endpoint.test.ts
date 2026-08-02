import { describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '~/auth/session'
import type { dbProvider } from './db-provider'
import { respondToZeroMutate } from './mutate-endpoint'

const API_KEY = 'zero-cache-mutate-key-long-enough-to-be-real'

/**
 * zero-cache names the app and the schema version in the query string; the push
 * processor parses them, so a request without them fails for the wrong reason.
 */
const MUTATE_URL = 'https://nicbk.com/api/zero/mutate?schema=1&appID=zero'

function sessionFor(userId: string): AuthSession {
  return { user: { id: userId } } as unknown as AuthSession
}

/**
 * A database that fails if it is ever touched.
 *
 * Every case here is refused before any mutator could run, so reaching Postgres
 * at all would be the bug — an unauthorized write must not open a transaction.
 */
const unreachableDatabase = {
  transaction: () => {
    throw new Error('the database must not be reached for a refused request')
  },
} as unknown as typeof dbProvider

function mutateRequest(
  headers: Record<string, string> = { 'X-Api-Key': API_KEY },
): Request {
  return new Request(MUTATE_URL, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientGroupID: 'group-1',
      mutations: [
        {
          type: 'custom',
          id: 1,
          clientID: 'client-1',
          name: 'articles.create',
          args: [{}],
          timestamp: 0,
        },
      ],
      pushVersion: 1,
      requestID: 'request-1',
      schemaVersion: 1,
      timestamp: 0,
    }),
  })
}

describe('respondToZeroMutate', () => {
  it('refuses a caller that is not zero-cache', async () => {
    const getSession = vi.fn(async () => sessionFor('user-a'))

    const response = await respondToZeroMutate(
      mutateRequest({ 'X-Api-Key': 'wrong-key-of-a-different-length' }),
      { apiKey: API_KEY, getSession, dbProvider: unreachableDatabase },
    )

    expect(response.status).toBe(403)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('refuses a request carrying no valid session', async () => {
    // The endpoint has no mutators to run, but it must not be a hole waiting
    // for the first one: an unauthenticated write is refused, not accepted and
    // silently ignored.
    const response = await respondToZeroMutate(mutateRequest(), {
      apiKey: API_KEY,
      getSession: async () => null,
      dbProvider: unreachableDatabase,
    })

    expect(response.status).toBe(401)
  })

  it('refuses a request with no key at all', async () => {
    const response = await respondToZeroMutate(mutateRequest({}), {
      apiKey: API_KEY,
      getSession: async () => sessionFor('user-a'),
      dbProvider: unreachableDatabase,
    })

    expect(response.status).toBe(403)
  })
})
