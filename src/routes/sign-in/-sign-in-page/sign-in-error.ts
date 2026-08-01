/**
 * Turns Better Auth's OAuth failure code into the sentence shown on the page.
 *
 * Better Auth routes every callback failure through one helper
 * (`redirectOnError` in `better-auth/dist/oauth2/errors.mjs`), which appends
 * `?error=<code>` to the `errorCallbackURL` the sign-in request supplied — this
 * page. The set of codes is open-ended: some are Better Auth's own
 * (`state_mismatch`, `invalid_code`, `unable_to_get_user_info`, …) and some are
 * whatever Google put in its redirect. So exactly one code is distinguished —
 * the one that isn't a malfunction — and everything else shares a single
 * message. Enumerating the rest would mean either leaking internals into the UI
 * or maintaining a translation table that silently rots as Better Auth changes.
 */

/**
 * Google's code for "the user said no" — they closed the consent screen or
 * denied access. Nothing is broken, so the page shouldn't imply it is.
 */
const ACCESS_DENIED = 'access_denied'

const CANCELLED_MESSAGE = 'Sign-in was cancelled.'

/**
 * Shown for every failure that isn't a deliberate cancellation — including one
 * that never reached Google at all, which is why it is exported rather than
 * only reachable through a code.
 */
export const GENERIC_SIGN_IN_ERROR =
  "Sign-in didn't complete. Please try again."

/**
 * The message for a failure code, or `null` when there is no error to show.
 */
export function signInErrorMessage(code: string | undefined): string | null {
  if (code === undefined || code === '') {
    return null
  }
  return code === ACCESS_DENIED ? CANCELLED_MESSAGE : GENERIC_SIGN_IN_ERROR
}
