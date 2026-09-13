import { describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '~/auth/session'
import type { ZeroContext } from './context'
import type { dbProvider } from './db-provider'
import { respondToZeroMutate, runMutation } from './mutate-endpoint'

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

/** As above, for the queue a server effect would reach if a mutation ran. */
const unreachableQueue = () => {
  throw new Error('the queue must not be reached for a refused request')
}

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
      {
        apiKey: API_KEY,
        getSession,
        dbProvider: unreachableDatabase,
        getQueue: unreachableQueue,
      },
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
      getQueue: unreachableQueue,
    })

    expect(response.status).toBe(401)
  })

  it('refuses a request with no key at all', async () => {
    const response = await respondToZeroMutate(mutateRequest({}), {
      apiKey: API_KEY,
      getSession: async () => sessionFor('user-a'),
      dbProvider: unreachableDatabase,
      getQueue: unreachableQueue,
    })

    expect(response.status).toBe(403)
  })
})

describe('runMutation', () => {
  const CONTEXT: ZeroContext = { id: 'reader-1' }
  const ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-000000000a01'

  /**
   * A transaction that answers every lookup with a row and records the writes,
   * plus the pieces `server-effects.ts` reaches for on the server's copy.
   */
  function stubTransaction() {
    const writes: string[] = []
    const table = (name: string) => ({
      insert: async () => void writes.push(`${name}.insert`),
      update: async () => void writes.push(`${name}.update`),
      upsert: async () => void writes.push(`${name}.upsert`),
      delete: async () => void writes.push(`${name}.delete`),
    })
    const tx = {
      location: 'server',
      dbTransaction: { wrappedTransaction: {} },
      run: async () => [{ id: 'a-row' }],
      mutate: {
        tags: table('tags'),
        articleTags: table('articleTags'),
        articles: table('articles'),
        annotations: table('annotations'),
      },
    }
    return { tx: tx as never, writes }
  }

  function queueSpy() {
    const send = vi.fn(async () => 'job-id')
    return { getQueue: async () => ({ send }) as never, send }
  }

  it('runs the mutator the request named', async () => {
    const { tx, writes } = stubTransaction()
    const { getQueue } = queueSpy()

    await runMutation({ ctx: CONTEXT, getQueue }, tx, 'articles.delete', {
      id: ARTICLE,
    })

    expect(writes).toEqual(['articles.delete'])
  })

  it('runs the mutator’s follow-up on the same transaction, after it', async () => {
    // The ordering is the design: an effect is a consequence of a write that
    // succeeded, and it shares the transaction so a throw from it rolls that
    // write back rather than leaving a row gone and its cleanup never asked
    // for. Neither property is visible from the endpoint that calls this.
    const { tx, writes } = stubTransaction()
    const { getQueue, send } = queueSpy()
    const order: string[] = []
    send.mockImplementation(async () => {
      order.push(`effect after ${writes.join()}`)
      return 'job-id'
    })

    await runMutation({ ctx: CONTEXT, getQueue }, tx, 'articles.delete', {
      id: ARTICLE,
    })

    expect(order).toEqual(['effect after articles.delete'])
  })

  it('does not run a follow-up for a mutation that has none', async () => {
    const { tx, writes } = stubTransaction()
    const { getQueue, send } = queueSpy()

    await runMutation({ ctx: CONTEXT, getQueue }, tx, 'articles.setStatus', {
      id: ARTICLE,
      status: 'read',
    })

    expect(writes).toEqual(['articles.update'])
    expect(send).not.toHaveBeenCalled()
  })

  it('refuses a name the registry does not hold', async () => {
    // What stops an invented mutator name from being a silent no-op. The
    // endpoint relies on this rather than checking the name itself.
    const { tx } = stubTransaction()
    const { getQueue } = queueSpy()

    await expect(
      runMutation({ ctx: CONTEXT, getQueue }, tx, 'articles.obliterate', {
        id: ARTICLE,
      }),
    ).rejects.toThrow(/Mutator not found/)
  })
})
