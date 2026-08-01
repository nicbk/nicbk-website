import { describe, expect, it, vi } from 'vitest'

/**
 * The mount itself: this route is the only thing exposing Better Auth over
 * HTTP, so the handlers must exist and must hand the whole request to it
 * unchanged (its own router dispatches among the many endpoints under
 * /api/auth/*). The behaviour behind them is covered against a real database
 * in src/auth/auth.integration.test.ts.
 */

const handler = vi.hoisted(() => vi.fn(async () => new Response('ok')))
vi.mock('~/auth/auth', () => ({ auth: { handler } }))

const { Route } = await import('./$')

describe('the /api/auth/* mount', () => {
  it('serves the methods Better Auth uses, and no others', () => {
    const handlers = Route.options.server?.handlers as
      | Record<string, unknown>
      | undefined

    expect(Object.keys(handlers ?? {}).sort()).toEqual(['GET', 'POST'])
  })

  it.each([
    'GET',
    'POST',
  ] as const)('passes a %s request to Better Auth untouched', async (method) => {
    handler.mockClear()
    const handlers = Route.options.server?.handlers as unknown as Record<
      string,
      (opts: { request: Request }) => Promise<Response>
    >
    const request = new Request('https://nicbk.com/api/auth/get-session', {
      method,
    })

    const response = await handlers[method]?.({ request })

    expect(handler).toHaveBeenCalledWith(request)
    expect(await response?.text()).toBe('ok')
  })
})
