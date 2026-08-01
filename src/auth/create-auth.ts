import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { type DatabaseHandle } from '~/db/create-database'
import * as schema from '~/db/schema'

/** How long a session stays valid without any activity. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

/**
 * How old a session must be before activity refreshes its expiry. Rotating on
 * every request would write to the database on each page view; a day is the
 * usual balance between that cost and keeping active users signed in.
 */
const SESSION_REFRESH_AGE_SECONDS = 60 * 60 * 24

export interface AuthConfig {
  /**
   * The app's own public base URL. OAuth callback URLs are derived from it, so
   * it must match the redirect URI registered with Google exactly.
   */
  baseURL: string
  /** Signing key for session tokens and OAuth state. */
  secret: string
  /** Google OAuth client credentials. */
  google: { clientId: string; clientSecret: string }
  /**
   * Origins allowed to initiate authenticated requests. Better Auth rejects
   * anything else via its Origin/Fetch-Metadata checks, which is this app's
   * CSRF protection — there is deliberately no second CSRF library.
   */
  trustedOrigins: string[]
  /**
   * Whether cookies carry the `Secure` attribute. True everywhere the app is
   * served over HTTPS; false only for plain-HTTP local development, where a
   * Secure cookie would simply never be stored.
   */
  useSecureCookies: boolean
}

/**
 * Builds a Better Auth instance over the given database.
 *
 * Google is the only sign-in method (the one third-party exception in
 * high-level-guidance/design/DESIGN.md), and identity lives in the same
 * Postgres as everything else, through Drizzle.
 *
 * Every security-relevant setting is written out explicitly, including the
 * ones that match Better Auth's defaults, so the posture is readable here
 * rather than inferred from a library version — the requirement in
 * research/security-privacy/session-and-auth-hardening.md.
 *
 * A factory rather than a module-level singleton so tests can build an
 * instance against a throwaway database; `auth.ts` holds the application's
 * one instance, configured from the validated environment.
 */
export function createAuth({ db }: DatabaseHandle, config: AuthConfig) {
  return betterAuth({
    baseURL: config.baseURL,
    secret: config.secret,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    socialProviders: {
      google: {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
      },
    },
    session: {
      expiresIn: SESSION_MAX_AGE_SECONDS,
      updateAge: SESSION_REFRESH_AGE_SECONDS,
    },
    trustedOrigins: config.trustedOrigins,
    advanced: {
      useSecureCookies: config.useSecureCookies,
      defaultCookieAttributes: {
        // Not readable from JavaScript, so an XSS bug can't exfiltrate a
        // session token.
        httpOnly: true,
        // Sent on top-level navigations but not cross-site subrequests —
        // required for the OAuth redirect back from Google to arrive with the
        // state cookie, while still blocking cross-site form posts.
        sameSite: 'lax',
        secure: config.useSecureCookies,
      },
    },
    // Must stay LAST in this array. Under TanStack Start's SSR model, cookies
    // set by Better Auth are otherwise silently dropped — sign-in appears to
    // succeed and then the session never persists.
    plugins: [tanstackStartCookies()],
  })
}

/** The application's auth instance type, for callers that need to name it. */
export type Auth = ReturnType<typeof createAuth>
