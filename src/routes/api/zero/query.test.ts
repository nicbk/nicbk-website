import { describe, expect, it, vi } from 'vitest'

/**
 * The mount itself: that this route exists, accepts only POST, and hands the
 * request to `respondToZeroQuery` along with the application's configured key
 * and session reader. Everything the endpoint actually decides is covered in
 * src/zero/query-endpoint.test.ts and, against a real database, in
 * src/zero/zero.integration.test.ts.
 */

const respondToZeroQuery = vi.hoisted(() =>
  vi.fn(async () => new Response('ok')),
)
const getSession = vi.hoisted(() => vi.fn())

vi.mock('~/zero/query-endpoint', () => ({ respondToZeroQuery }))
vi.mock('~/auth/auth', () => ({ getSession }))

const { Route } = await import('./query')

describe('the /api/zero/query mount', () => {
  it('serves POST, and nothing else', () => {
    // zero-cache only ever POSTs here, and a GET that returned query ASTs
    // would be a needlessly larger surface.
    const handlers = Route.options.server?.handlers as
      | Record<string, unknown>
      | undefined

    expect(Object.keys(handlers ?? {})).toEqual(['POST'])
  })

  it('passes the request through with the configured key and session reader', async () => {
    const handlers = Route.options.server?.handlers as unknown as Record<
      string,
      (opts: { request: Request }) => Promise<Response>
    >
    const request = new Request('https://nicbk.com/api/zero/query', {
      method: 'POST',
    })

    const response = await handlers['POST']?.({ request })

    expect(respondToZeroQuery).toHaveBeenCalledWith(request, {
      apiKey: expect.any(String),
      getSession,
    })
    expect(await response?.text()).toBe('ok')
  })
})
