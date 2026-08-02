// A separated `import type` statement, against this project's inline-type
// convention (research/coding-conventions/import-conventions.md), and
// deliberately so: `verbatimModuleSyntax` compiles the inline form
// `import { type Auth } from './create-auth'` to `import {} from
// './create-auth'` — a side-effect import that survives into whatever bundle
// this module lands in. Since the route guard reaches this module, that form
// pulled Better Auth, Drizzle, and Postgres' driver into the *client* bundle,
// where hydration died on `Buffer is not defined` and every page silently
// stopped responding to clicks. `import type` is erased outright. See the
// dated revision in that conventions file.
// biome-ignore lint/style/useImportType: the inline form emits a side-effect import that drags this server-only module into the client bundle (see above)
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
