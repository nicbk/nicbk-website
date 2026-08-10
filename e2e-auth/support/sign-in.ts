import type { Cookie, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Driving the sign-in flow, shared by every spec in this tier.
 *
 * Google's consent screen is stubbed rather than automated — Google actively
 * blocks automated sign-in, and it isn't this app's code anyway. The two halves
 * of the flow are stubbed in the two places the requests actually happen: the
 * browser's navigation to `/authorize` here, and the server's `/token` exchange
 * inside the app process (google-token-endpoint-stub.mjs, which explains why
 * the mechanism differs from the one the research file originally decided).
 * `/userinfo` needs no stub: Better Auth's Google provider reads the profile
 * out of the id token instead of calling it.
 */

export const GOOGLE_AUTHORIZE_PATTERN =
  'https://accounts.google.com/o/oauth2/v2/auth*'

export const SESSION_COOKIE = 'better-auth.session_token'

const GOOGLE_BUTTON = { name: 'sign in with Google' }

/**
 * Answers the browser's navigation to Google's consent screen the way Google
 * would after the user acts on it, echoing back the `state` that ties the
 * response to the request the app started.
 */
export async function stubGoogleConsent(
  page: Page,
  outcome: { code: string } | { error: string },
): Promise<{ authorizeUrl: () => URL }> {
  let seen: URL | undefined

  await page.route(GOOGLE_AUTHORIZE_PATTERN, async (route) => {
    const requested = new URL(route.request().url())
    seen = requested

    const callback = new URL(String(requested.searchParams.get('redirect_uri')))
    callback.searchParams.set(
      'state',
      String(requested.searchParams.get('state')),
    )
    if ('code' in outcome) {
      callback.searchParams.set('code', outcome.code)
      callback.searchParams.set('scope', 'openid email profile')
    } else {
      callback.searchParams.set('error', outcome.error)
    }

    await route.fulfill({ status: 302, headers: { location: callback.href } })
  })

  return {
    authorizeUrl: () => {
      if (!seen) {
        throw new Error('the browser never navigated to Google')
      }
      return seen
    },
  }
}

/** Clicks the sign-in button, retrying until React has hydrated it. */
export async function clickSignIn(page: Page): Promise<void> {
  // Clicks that land before hydration are silently dropped — the TanStack
  // Start + Playwright timing gap flagged in
  // research/testing-qa/e2e-testing.md. "The flow started" is any move off the
  // exact URL we were on; a cancelled sign-in comes back to /sign-in itself,
  // just carrying an error instead of a destination.
  const startedAt = page.url()
  await expect(async () => {
    await page.getByRole('button', GOOGLE_BUTTON).click()
    await expect(page).not.toHaveURL(startedAt, { timeout: 2_000 })
  }).toPass()
}

/** The session cookie the browser is holding, if any. */
export async function sessionCookie(page: Page): Promise<Cookie | undefined> {
  const cookies = await page.context().cookies()
  return cookies.find((cookie) => cookie.name === SESSION_COOKIE)
}

/**
 * Opens a guarded page with the session the tier already signed in for.
 *
 * What almost every spec here wants: it is *about* the page, not about getting
 * to it. The cookie arrives with the browser context from `auth.setup.ts`
 * (`storageState` in playwright.auth.config.ts), so this is one navigation
 * rather than the seven-step OAuth round trip `signInAndLandOn` performs.
 *
 * Landing on the destination rather than at `/sign-in` is asserted, not
 * assumed: if the shared session were missing or dead, the guard would bounce
 * the page and every assertion after this would fail for a reason that had
 * nothing to do with the test. This says so on the first line instead.
 */
export async function landOn(page: Page, destination: string): Promise<void> {
  await page.goto(destination)
  await expect(page).toHaveURL(destination)
}

/**
 * Signs in through the stubbed Google and lands on `destination`.
 *
 * Goes through the guard rather than straight to `/sign-in`: asking for a
 * protected page while signed out is how a reader actually arrives at sign-in,
 * so the whole path gets exercised.
 *
 * Used by `auth.setup.ts` once per run, and by the specs that are themselves
 * about sessions — `sign-in-flow.spec.ts` and `user-settings.spec.ts`, which
 * log out and delete the account and so must hold one of their own. Everything
 * else wants `landOn`.
 */
export async function signInAndLandOn(
  page: Page,
  destination: string,
): Promise<void> {
  await stubGoogleConsent(page, { code: 'e2e-auth-code' })

  await page.goto(destination)
  await expect(page).toHaveURL(
    `/sign-in?returnTo=${encodeURIComponent(destination)}`,
  )

  await clickSignIn(page)
  await expect(page).toHaveURL(destination)
}
