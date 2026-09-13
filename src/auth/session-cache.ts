import { fetchSession } from './fetch-session'
import type { AuthSession } from './session'

/**
 * The session resolution for this page load, or `null` if nothing has asked for
 * one yet.
 *
 * It holds the *promise*, not the session: callers arriving while the first ask
 * is still in flight join it rather than starting a second one.
 */
let resolution: Promise<AuthSession> | null = null

/**
 * Resolves the current session, asking the server at most once per page load.
 *
 * Every client-side navigation into `/lit-tracker` runs the route guard, and
 * every run used to cost one round trip to re-answer a question the document
 * already had — about 15 ms of work behind about 120 ms of waiting on the
 * deployed host (features/tracker-navigation-latency/research.md). The answer
 * cannot change without the browser knowing: a session ends by signing out or
 * deleting the account, and both call {@link forgetSession} where they succeed.
 *
 * **What this gives up**, stated rather than discovered: a session revoked
 * somewhere else — another device, an expiry, an admin — keeps showing the
 * tracker's *shell* until the next full page load. None of its data comes with
 * it. Every path that serves anything resolves the session itself, server-side,
 * from the request's own cookie; this caches the answer to a UX question, never
 * a permission.
 */
export function resolveSession(): Promise<AuthSession> {
  // One server process serves every reader, so a session remembered there would
  // be one reader's answer handed to the next. Nothing is cached outside a
  // browser, and `session-cache.server.test.ts` asserts that in the environment
  // the server bundle actually runs in.
  if (typeof window === 'undefined') {
    return fetchSession()
  }

  if (resolution === null) {
    const attempt: Promise<AuthSession> = fetchSession().catch(
      (error: unknown) => {
        // A failed ask is not an answer. Forget it so the next navigation tries
        // again instead of replaying the failure for the life of the document —
        // unless this attempt has already been forgotten and replaced, in which
        // case the newer one is not ours to discard.
        if (resolution === attempt) {
          resolution = null
        }
        throw error
      },
    )
    resolution = attempt
  }

  return resolution
}

/**
 * Forgets the cached session, so the next call asks the server again.
 *
 * Signing out and deleting the account both happen in the browser and neither
 * reloads the page, so nothing else would tell this module that the answer has
 * changed. Called where each of those succeeds.
 */
export function forgetSession(): void {
  resolution = null
}
