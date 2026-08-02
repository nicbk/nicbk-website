import { expect, test } from '@playwright/test'
import { GOOGLE_TEST_ACCOUNT } from './support/google-stub.mjs'
import {
  clickSignIn,
  sessionCookie,
  stubGoogleConsent,
} from './support/sign-in'

/**
 * The one test that exercises the login flow itself, end to end: the button,
 * the trip out to Google, the callback, the session cookie, and landing back on
 * the page the user originally wanted. How Google is stubbed — and why it is
 * stubbed in two places rather than one — is documented in ./support/sign-in.ts.
 */

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
