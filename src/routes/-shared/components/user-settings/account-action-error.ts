/**
 * Better Auth's code for "this session is too old to do something
 * irreversible". Its `/delete-user` endpoint returns it when the session was
 * created longer ago than the configured `freshAge` (see
 * `SESSION_FRESH_AGE_SECONDS` in src/auth/create-auth.ts).
 */
const STALE_SESSION_CODE = 'SESSION_EXPIRED'

/** Shown when signing out fails — a network or server problem, always retryable. */
export const SIGN_OUT_FAILED_MESSAGE =
  "Signing out didn't work. Please try again."

/** Shown when a delete fails for any reason other than a stale session. */
export const DELETE_FAILED_MESSAGE =
  "Deleting your account didn't work. Please try again."

/**
 * Shown when the delete was refused because the session is no longer fresh.
 * Unlike the message above, retrying the same action can't help — the user has
 * to prove who they are again first, which is why the modal pairs this message
 * with a button back through Google.
 */
export const STALE_SESSION_MESSAGE =
  'For security, sign in again before deleting your account.'

/** Shown when the trip back through Google can't even be started. */
export const SIGN_IN_AGAIN_FAILED_MESSAGE =
  "Starting sign-in didn't work. Please try again."

/** Whether a failed delete needs re-authentication rather than a retry. */
export function isStaleSessionError(code: string | undefined): boolean {
  return code === STALE_SESSION_CODE
}

/**
 * The message to show for a failed delete.
 *
 * Codes are open-ended — Better Auth adds them over time and any of them can
 * surface here — so exactly one is recognized (the one with a different
 * remedy) and everything else falls back to the retryable message rather than
 * being reported by a code the reader can do nothing with.
 */
export function deleteFailedMessage(code: string | undefined): string {
  return isStaleSessionError(code)
    ? STALE_SESSION_MESSAGE
    : DELETE_FAILED_MESSAGE
}
