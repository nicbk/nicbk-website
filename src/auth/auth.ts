import { db, pool } from '~/db/client'
import { env } from '~/env'
import { createAuth } from './create-auth'
import type { AuthSession } from './session'
import { getSessionFrom } from './session'

/**
 * The application's Better Auth instance, configured from the validated
 * environment and backed by the shared database client.
 *
 * `BETTER_AUTH_URL` is both the base for OAuth callbacks and the only trusted
 * origin: this app is served from exactly one origin, so anything else
 * initiating an authenticated request is by definition not us. Cookies are
 * `Secure` unless the app is running over plain HTTP in development, where a
 * Secure cookie would never be stored at all.
 */
export const auth = createAuth(
  { db, pool },
  {
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
    useSecureCookies: env.BETTER_AUTH_URL.startsWith('https://'),
  },
)

/**
 * Reads the session for a request against the application's auth instance —
 * the server-side "who is this?" every protected surface will call.
 */
export function getSession(request: Request): Promise<AuthSession> {
  return getSessionFrom(auth, request)
}
