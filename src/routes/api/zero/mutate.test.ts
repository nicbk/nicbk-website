import { describe, expect, it, vi } from 'vitest'

/**
 * The mount itself, as for the query route next door. What the endpoint decides
 * is covered in src/zero/mutate-endpoint.test.ts and, against a real database,
 * in src/zero/zero.integration.test.ts.
 *
 * `~/zero/db-provider` is mocked because importing it opens the application's
 * Postgres pool from the validated environment — server wiring the unit tier
 * has no business reaching.
 */

const respondToZeroMutate = vi.hoisted(() =>
  vi.fn(async () => new Response('ok')),
)
const getSession = vi.hoisted(() => vi.fn())
const dbProvider = vi.hoisted(() => ({ transaction: vi.fn() }))

vi.mock('~/zero/mutate-endpoint', () => ({ respondToZeroMutate }))
vi.mock('~/auth/auth', () => ({ getSession }))
vi.mock('~/zero/db-provider', () => ({ dbProvider }))

const { Route } = await import('./mutate')

describe('the /api/zero/mutate mount', () => {
  it('serves POST, and nothing else', () => {
    const handlers = Route.options.server?.handlers as
      | Record<string, unknown>
      | undefined

    expect(Object.keys(handlers ?? {})).toEqual(['POST'])
  })

  it('passes the request through with the configured key, session reader, and database', async () => {
    const handlers = Route.options.server?.handlers as unknown as {
      POST: (opts: { request: Request }) => Promise<Response>
    }
    const request = new Request('https://nicbk.com/api/zero/mutate', {
      method: 'POST',
    })

    const response = await handlers.POST({ request })

    expect(respondToZeroMutate).toHaveBeenCalledWith(request, {
      apiKey: expect.any(String),
      getSession,
      dbProvider,
    })
    expect(await response.text()).toBe('ok')
  })
})
