import { expect, test, toggleThemeTo } from './fixtures'

const GOOGLE_BUTTON = { name: 'sign in with Google' }

/**
 * The `/sign-in` page as a page: its chrome, metadata, theming, and the inline
 * error it renders straight from the URL.
 *
 * None of this needs a database or a stubbed Google — the error case is pure
 * URL state, which is exactly how Better Auth hands a failure back to this page.
 * The round trip through Google itself is a different tier with different
 * requirements: see e2e-auth/sign-in-flow.spec.ts.
 */
test.describe('sign-in page', () => {
  test('renders inside the site shell with the Google button', async ({
    page,
  }) => {
    await page.goto('/sign-in')
    await expect(page.locator('header')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'sign in' })).toBeVisible()
    await expect(page.getByRole('button', GOOGLE_BUTTON)).toBeEnabled()
    await expect(
      page.getByText(/only needed for the academic literature tracker/i),
    ).toBeVisible()
  })

  test('sets its own title and meta description', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page).toHaveTitle('Sign in · Nicolás Kennedy')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Sign in with Google to use the academic literature tracker.',
    )
  })

  test('shows no error until one is reported', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('renders a failed callback inline, not as a toast', async ({ page }) => {
    // This is the URL Better Auth redirects to when the OAuth round trip
    // fails; the page has to make sense arrived at cold, with no client state.
    await page.goto('/sign-in?error=state_mismatch')

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText("Sign-in didn't complete.")
    // Inside the page's own content, next to the control — not floating chrome.
    await expect(page.locator('main').getByRole('alert')).toHaveCount(1)
  })

  test('distinguishes a cancelled sign-in from a broken one', async ({
    page,
  }) => {
    await page.goto('/sign-in?error=access_denied')
    await expect(page.getByRole('alert')).toContainText(
      'Sign-in was cancelled.',
    )
  })

  test('keeps the return-to destination out of the visible page', async ({
    page,
  }) => {
    // A destination is carried in the URL, not advertised as a link — a page
    // that rendered it would turn a hand-crafted `returnTo` into a clickable
    // link on this site.
    await page.goto('/sign-in?returnTo=https%3A%2F%2Fevil.example%2Fphish')
    await expect(page.locator('main a')).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText('evil.example')
  })

  test('renders correctly in both themes with no flash of the wrong one', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/sign-in')
    // The theme is set by a blocking inline script before first paint, so the
    // attribute is already correct on the very first frame.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', GOOGLE_BUTTON)).toBeVisible()

    await toggleThemeTo(page, 'light')
    await expect(page.getByRole('button', GOOGLE_BUTTON)).toBeVisible()
  })

  test('does not overflow horizontally at a narrow viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 760 })
    await page.goto('/sign-in?error=state_mismatch')

    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    // With the error showing, so the inline message is scanned too.
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/sign-in?error=state_mismatch')
    await expectNoA11yViolations()
    await toggleThemeTo(page, 'dark')
    await expectNoA11yViolations()
  })
})
