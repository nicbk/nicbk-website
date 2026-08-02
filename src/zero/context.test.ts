import { describe, expect, it } from 'vitest'
import type { AuthSession } from '~/auth/session'
import { zeroContextFrom } from './context'

/**
 * A resolved Better Auth session, trimmed to what the context derivation reads.
 * The cast keeps the fixture to the fields under test rather than restating
 * Better Auth's whole session shape.
 */
function sessionFor(userId: string): AuthSession {
  return { user: { id: userId } } as unknown as AuthSession
}

describe('zeroContextFrom', () => {
  it('carries the session user id', () => {
    expect(zeroContextFrom(sessionFor('user-a'))).toEqual({ id: 'user-a' })
  })

  it('produces no context for a request without a valid session', () => {
    // Signed out, expired, and tampered-with sessions all arrive here as null.
    // Returning undefined rather than a guest context is what makes every query
    // have to say what it does with "nobody".
    expect(zeroContextFrom(null)).toBeUndefined()
  })

  it('reads nothing but the session', () => {
    // The property everything else rests on: no request body, header, or query
    // argument reaches this function, so nothing a client sends can change
    // which user's rows a query returns. Asserted by construction — the
    // signature takes only a session — and pinned here so a later signature
    // change has to break a test rather than slip through review.
    expect(zeroContextFrom).toHaveLength(1)
  })
})
