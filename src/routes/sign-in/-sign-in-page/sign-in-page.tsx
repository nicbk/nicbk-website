import { useState } from 'react'
import { authClient } from '~/auth/auth-client'
import { sanitizeReturnTo } from '~/auth/return-to'
import { GENERIC_SIGN_IN_ERROR, signInErrorMessage } from './sign-in-error'
import styles from './sign-in-page.module.css'

/** Where Better Auth sends the user back to when the OAuth flow fails. */
const ERROR_CALLBACK_URL = '/sign-in'

/** Ties the inline error to the button that produced it, for screen readers. */
const ERROR_ID = 'sign-in-error'

interface SignInPageProps {
  /**
   * The raw `returnTo` search param — where the user was headed before being
   * sent here. Untrusted, and sanitized before use.
   */
  returnTo?: string | undefined
  /** The raw `error` search param Better Auth sets on a failed OAuth callback. */
  error?: string | undefined
}

/**
 * The one sign-in surface for the whole site
 * (research/ui-ux/pages/site-wide/pages/sign-in.md): a line explaining why
 * signing in is needed, a button that hands off to Google, and an inline error
 * when that doesn't work out.
 *
 * Deliberately minimal. Sign-in is a detour, not a destination — the user asked
 * for some other page and is only here because it was protected, so this page's
 * job is to get them back out of it.
 */
export function SignInPage({ returnTo, error }: SignInPageProps) {
  // A sign-in attempt that never reaches Google (the browser is offline, the
  // server is down) fails right here instead of coming back through the
  // callback, so it needs its own place to be recorded.
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // The URL's error came from a completed round trip and describes the more
  // recent attempt, so it wins over anything left in local state.
  const message = signInErrorMessage(error) ?? requestError

  async function startGoogleSignIn() {
    setRequestError(null)
    setIsRedirecting(true)

    const { error: requestFailure } = await authClient.signIn.social({
      provider: 'google',
      // Better Auth redirects here itself once the callback succeeds, which is
      // what carries the user back to the page that sent them.
      callbackURL: sanitizeReturnTo(returnTo),
      errorCallbackURL: ERROR_CALLBACK_URL,
    })

    if (requestFailure) {
      setIsRedirecting(false)
      setRequestError(GENERIC_SIGN_IN_ERROR)
    }
    // On success the browser is already navigating to Google; leaving the
    // button disabled avoids a second flow being started underneath it.
  }

  return (
    <div className={styles.page}>
      {/* The page's single visible <h1> and the route-change focus-handoff
          target (src/focus-handoff.ts). */}
      <h1 className={styles.title}>sign in</h1>

      <p className={styles.explanation}>
        Signing in is only needed for the academic literature tracker. It keeps
        your library, annotations, and reading progress attached to your
        account.
      </p>

      {message !== null && (
        // An inline message rather than a toast: this is a form-like
        // interaction, so the error belongs next to the control that caused it
        // (research/ui-ux/design-system.md, "Reactive UI feedback patterns").
        // role="alert" announces it when it appears mid-session; the button's
        // aria-describedby covers the case where the page loads with it
        // already present.
        <p className={styles.error} id={ERROR_ID} role="alert">
          {message}
        </p>
      )}

      <button
        type="button"
        className={styles.button}
        onClick={startGoogleSignIn}
        disabled={isRedirecting}
        aria-describedby={message === null ? undefined : ERROR_ID}
      >
        sign in with Google
      </button>
    </div>
  )
}
