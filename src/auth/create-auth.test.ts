import { describe, expect, it } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { createAuth } from './create-auth'

/**
 * Configuration-level guards on the auth instance. The behaviour these
 * settings produce — a real cookie on a real sign-in — is covered by
 * auth.integration.test.ts against a real database; what is checked here is
 * that the instance is *asked* for the posture the security research
 * requires, which is cheap to assert and easy to regress silently.
 */

/** The auth factory only stores the handle; nothing here opens a connection. */
const databaseStub = { db: {}, pool: {} } as unknown as DatabaseHandle

function buildAuth(overrides: { useSecureCookies?: boolean } = {}) {
  return createAuth(databaseStub, {
    baseURL: 'https://nicbk.com',
    secret: 'unit-test-secret-value-of-at-least-32-chars',
    google: { clientId: 'client-id', clientSecret: 'client-secret' },
    trustedOrigins: ['https://nicbk.com'],
    useSecureCookies: overrides.useSecureCookies ?? true,
  })
}

describe('createAuth', () => {
  it('keeps the TanStack Start cookie plugin last in the plugin list', () => {
    // Order matters: anything after it and cookies are silently never set
    // under Start's SSR model, which looks like "sign-in works but the session
    // never persists" rather than an error.
    const plugins = buildAuth().options.plugins ?? []

    expect(plugins.length).toBeGreaterThan(0)
    expect(plugins.at(-1)?.id).toBe('tanstack-start-cookies')
  })

  it('asks for cookies that script cannot read and cross-site requests cannot carry', () => {
    const { advanced } = buildAuth().options

    expect(advanced?.defaultCookieAttributes).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })
    expect(advanced?.useSecureCookies).toBe(true)
  })

  it('drops the Secure attribute only where the app is served over plain HTTP', () => {
    // A Secure cookie is simply never stored by the browser on http://, so
    // local development would have no session at all.
    const { advanced } = buildAuth({ useSecureCookies: false }).options

    expect(advanced?.useSecureCookies).toBe(false)
    expect(advanced?.defaultCookieAttributes).toMatchObject({
      httpOnly: true,
      secure: false,
    })
  })

  it('bounds the session and refreshes it at most daily', () => {
    const { session } = buildAuth().options

    expect(session?.expiresIn).toBe(60 * 60 * 24 * 7)
    expect(session?.updateAge).toBe(60 * 60 * 24)
  })

  it('trusts only this app and offers only Google', () => {
    const options = buildAuth().options

    expect(options.trustedOrigins).toEqual(['https://nicbk.com'])
    expect(Object.keys(options.socialProviders ?? {})).toEqual(['google'])
  })
})
