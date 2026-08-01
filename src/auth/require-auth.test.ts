import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  requireAuth,
  requireSession,
  type SignedInSession,
} from './require-auth'

// The guard's only dependency on the server is the session lookup, so that is
// the boundary the test replaces — the alternative would drag the database
// client (and a real Postgres connection string) into a unit test.
const { fetchSession } = vi.hoisted(() => ({ fetchSession: vi.fn() }))
vi.mock('./fetch-session', () => ({ fetchSession }))

/** Stands in for whatever Better Auth returns for a signed-in request. */
const SIGNED_IN = {
  user: { id: 'user-1', email: 'reader@example.com' },
  session: { id: 'session-1' },
} as unknown as SignedInSession

/**
 * Unwraps the redirect a signed-out guard throws, failing the test if the call
 * returned normally or threw something else.
 */
function captureRedirect(run: () => unknown) {
  try {
    run()
  } catch (thrown) {
    if (isRedirect(thrown)) {
      return thrown.options
    }
    throw thrown
  }
  throw new Error('expected the guard to throw a redirect, but it returned')
}

beforeEach(() => {
  fetchSession.mockReset()
})

describe('requireSession', () => {
  it('permits the route and hands back the session when signed in', () => {
    expect(requireSession(SIGNED_IN, { href: '/lit/collection' })).toBe(
      SIGNED_IN,
    )
  })

  it('redirects a signed-out visitor to /sign-in', () => {
    const redirect = captureRedirect(() =>
      requireSession(null, { href: '/lit/collection' }),
    )
    expect(redirect.to).toBe('/sign-in')
  })

  it('carries the requested URL through as the return-to target', () => {
    const redirect = captureRedirect(() =>
      requireSession(null, { href: '/lit/collection?sort=recent#notes' }),
    )
    expect(redirect.search).toEqual({
      returnTo: '/lit/collection?sort=recent#notes',
    })
  })

  it('drops a return-to target that is not a same-origin app path', () => {
    // The href reaching a route guard comes from the router, but the guard is
    // the last thing standing between a hand-crafted URL and the sign-in
    // page's redirect, so it sanitizes rather than trusts.
    const redirect = captureRedirect(() =>
      requireSession(null, { href: '//evil.example/phish' }),
    )
    expect(redirect.search).toEqual({})
  })

  it('omits the return-to param when the destination is the default', () => {
    const redirect = captureRedirect(() => requireSession(null, { href: '/' }))
    expect(redirect.search).toEqual({})
  })
})

describe('requireAuth', () => {
  it('resolves the session for the request and permits a signed-in user', async () => {
    fetchSession.mockResolvedValue(SIGNED_IN)
    await expect(requireAuth({ location: { href: '/lit' } })).resolves.toBe(
      SIGNED_IN,
    )
  })

  it('rejects with a redirect when no session is resolved', async () => {
    fetchSession.mockResolvedValue(null)
    const thrown = await requireAuth({ location: { href: '/lit' } }).catch(
      (error: unknown) => error,
    )
    expect(isRedirect(thrown)).toBe(true)
    expect((thrown as Response & { options: { to: string } }).options.to).toBe(
      '/sign-in',
    )
  })
})
