// `create-auth` is server-only — it reaches Better Auth, Drizzle, and the
// Postgres driver — so this must stay a type-only import that is *erased*, not
// one that leaves a side-effect import behind. The project-wide separated-type
// convention is what guarantees that (see
// research/coding-conventions/import-conventions.md); this note records why
// the guarantee matters here specifically, since the route guard reaches this
// module from the client.
import type { Auth } from './create-auth'

/**
 * The signed-in user and their session, as Better Auth returns them, or `null`
 * when the request carries no valid session.
 */
export type AuthSession = Awaited<ReturnType<Auth['api']['getSession']>> | null

/**
 * Reads the session belonging to a request.
 *
 * Server-side only, and the single place anything asks "who is this?": it
 * validates the session cookie against the database rather than trusting
 * anything the client sent. Returns `null` for a signed-out, expired, or
 * tampered-with session — callers decide what that means (the route guard
 * redirects to sign-in; a settings surface renders nothing).
 *
 * Takes the auth instance as a parameter so tests can pass one built against a
 * throwaway database; application code uses `getSession` from `auth.ts`, which
 * binds this to the app's own instance.
 */
export async function getSessionFrom(
  auth: Auth,
  request: Request,
): Promise<AuthSession> {
  return auth.api.getSession({ headers: request.headers })
}
