import { describe, expect, it, vi } from 'vitest'

/**
 * The mount itself, in the same shape as the Zero route mounts next door. What
 * the endpoint decides is covered in
 * `src/lit-tracker/upload/upload-endpoint.test.ts`, and against real
 * infrastructure in `src/lit-tracker/upload/upload.integration.test.ts`.
 *
 * `~/db/client` and the queue are mocked because importing either opens a real
 * connection from the validated environment — server wiring the unit tier has
 * no business reaching.
 */

const respondToUpload = vi.hoisted(() =>
  vi.fn(async (..._args: unknown[]) => new Response('ok')),
)
const getSession = vi.hoisted(() => vi.fn())
const getQueue = vi.hoisted(() => vi.fn())
const db = vi.hoisted(() => ({ transaction: vi.fn() }))
const pool = vi.hoisted(() => ({ end: vi.fn() }))

vi.mock('~/lit-tracker/upload/upload-endpoint', () => ({ respondToUpload }))
vi.mock('~/lit-tracker/upload/queue', () => ({ getQueue }))
vi.mock('~/auth/auth', () => ({ getSession }))
vi.mock('~/db/client', () => ({ db, pool }))

const { Route } = await import('./upload')

describe('the /api/lit-tracker/upload mount', () => {
  it('serves POST, and nothing else', () => {
    const handlers = Route.options.server?.handlers as
      | Record<string, unknown>
      | undefined

    expect(Object.keys(handlers ?? {})).toEqual(['POST'])
  })

  it('passes the request through with the database and the queue', async () => {
    const handlers = Route.options.server?.handlers as unknown as {
      POST: (opts: { request: Request }) => Promise<Response>
    }
    const request = new Request('https://nicbk.com/api/lit-tracker/upload', {
      method: 'POST',
    })

    const response = await handlers.POST({ request })

    expect(respondToUpload).toHaveBeenCalledWith(request, {
      getUserId: expect.any(Function),
      database: { db, pool },
      getQueue,
    })
    expect(await response.text()).toBe('ok')
  })

  it('derives the user id from the request own session, never from the body', async () => {
    // The rule /api/zero/query follows, and the reason every stored object is
    // filed under a server-derived owner.
    const handlers = Route.options.server?.handlers as unknown as {
      POST: (opts: { request: Request }) => Promise<Response>
    }
    await handlers.POST({
      request: new Request('https://nicbk.com/api/lit-tracker/upload', {
        method: 'POST',
      }),
    })

    const lastCall = respondToUpload.mock.calls.at(-1) as unknown as [
      Request,
      { getUserId: (request: Request) => Promise<string | null> },
    ]
    const { getUserId } = lastCall[1]

    const incoming = new Request('https://nicbk.com/api/lit-tracker/upload')
    getSession.mockResolvedValue({ user: { id: 'user-from-session' } })
    await expect(getUserId(incoming)).resolves.toBe('user-from-session')
    expect(getSession).toHaveBeenCalledWith(incoming)

    // No session is `null`, which the endpoint answers with a 401.
    getSession.mockResolvedValue(null)
    await expect(getUserId(incoming)).resolves.toBeNull()
  })
})
