import { describe, expect, it, vi } from 'vitest'
import { type Auth } from './create-auth'
import { getSessionFrom } from './session'

describe('getSessionFrom', () => {
  it('asks Better Auth to validate the request headers, not a client claim', () => {
    // The only input is the request's own headers: the session cookie is
    // checked against the database, and nothing a caller passes alongside can
    // stand in for it.
    const getSession = vi.fn().mockResolvedValue(null)
    const auth = { api: { getSession } } as unknown as Auth
    const request = new Request('https://nicbk.com/', {
      headers: { cookie: 'better-auth.session_token=abc' },
    })

    getSessionFrom(auth, request)

    expect(getSession).toHaveBeenCalledWith({ headers: request.headers })
  })

  it('passes the session through unchanged', async () => {
    const session = { user: { email: 'reader@example.com' } }
    const auth = {
      api: { getSession: vi.fn().mockResolvedValue(session) },
    } as unknown as Auth

    await expect(
      getSessionFrom(auth, new Request('https://nicbk.com/')),
    ).resolves.toBe(session)
  })
})
