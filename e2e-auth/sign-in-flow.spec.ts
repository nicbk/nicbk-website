import { expect, type Page, test } from '@playwright/test'
import { GOOGLE_TEST_ACCOUNT } from './support/google-stub.mjs'

const GOOGLE_BUTTON = { name: 'sign in with Google' }
const GOOGLE_AUTHORIZE_PATTERN = 'https://accounts.google.com/o/oauth2/v2/auth*'
const SESSION_COOKIE = 'better-auth.session_token'

/**
 * The one test that exercises the login flow itself, end to end: the button,
 * the trip out to Google, the callback, the session cookie, and landing back on
 * the page the user originally wanted.
 *
 * Google's consent screen is stubbed rather than automated — Google actively
 * blocks automated sign-in, and it isn't this app's code anyway. Its two halves
 * are stubbed in the two places the requests actually happen: the browser's
 * navigation to `/authorize` is intercepted here, and the server's `/token`
 * exchange in the app process (e2e-auth/support/google-token-endpoint-stub.mjs,
 * which explains why the mechanism differs from the one the research file
 * originally decided). `/userinfo` needs no stub: Better Auth's Google provider
 * reads the profile out of the id token instead of calling it.
 */

/**
 * Answers the browser's navigation to Google's consent screen the way Google
 * would after the user acts on it, echoing back the `state` that ties the
 * response to the request the app started.
 */
async function stubGoogleConsent(
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
async function clickSignIn(page: Page): Promise<void> {
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

async function sessionCookie(page: Page) {
  const cookies = await page.context().cookies()
  return cookies.find((cookie) => cookie.name === SESSION_COOKIE)
}

test.describe('Google sign-in flow', () => {
  test('signs the user in and returns them to where they were headed', async ({
    page,
  }) => {
    const google = await stubGoogleConsent(page, { code: 'e2e-auth-code' })

    await page.goto('/sign-in?returnTo=%2Fblog')
    await clickSignIn(page)

    // Landed back on the page carried into the flow, not a fixed destination.
    await expect(page).toHaveURL(/\/blog$/)

    // The authorize request was the real thing the provider built: this app's
    // client, this app's callback, and a PKCE challenge.
    const authorize = google.authorizeUrl()
    expect(authorize.searchParams.get('client_id')).toBe(
      'auth-e2e-google-client-id',
    )
    expect(authorize.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3100/api/auth/callback/google',
    )
    expect(authorize.searchParams.get('code_challenge')).toBeTruthy()

    const cookie = await sessionCookie(page)
    expect(cookie).toBeDefined()
    expect(cookie?.httpOnly).toBe(true)

    // The cookie belongs to the account the stubbed Google returned — the row
    // was really written and really read back.
    const session = await page.request.get('/api/auth/get-session')
    expect(session.ok()).toBe(true)
    expect(await session.json()).toMatchObject({
      user: {
        email: GOOGLE_TEST_ACCOUNT.email,
        name: GOOGLE_TEST_ACCOUNT.name,
      },
    })
  })

  test('shows the inline error and sets no cookie when sign-in is cancelled', async ({
    page,
  }) => {
    await stubGoogleConsent(page, { error: 'access_denied' })

    await page.goto('/sign-in?returnTo=%2Fblog')
    await clickSignIn(page)

    // Better Auth bounces the failure back to the errorCallbackURL the page
    // supplied — itself — with a machine-readable code.
    await expect(page).toHaveURL(/\/sign-in\?error=access_denied/)
    await expect(page.getByRole('alert')).toContainText(
      'Sign-in was cancelled.',
    )

    expect(await sessionCookie(page)).toBeUndefined()
    const session = await page.request.get('/api/auth/get-session')
    expect(await session.json()).toBeNull()
  })
})
