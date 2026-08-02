import { expect, test } from './fixtures'

test.describe('404 / not-found page', () => {
  test('an unmatched route returns HTTP 404 and renders the designed page inside the header', async ({
    page,
  }) => {
    const response = await page.goto('/definitely-not-a-page')

    // A real 404 on server render, not a 200 with not-found content — the
    // one requirement most likely to differ from the framework default, so
    // it is asserted on the navigation response, not just the DOM
    // (features/error-and-not-found/testing.md).
    expect(response?.status()).toBe(404)

    // Rendered inside the shared site shell (header present) with the
    // designed, lowercase, code-free heading.
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: 'page not found' }),
    ).toBeVisible()
    await expect(page.getByText('404')).toHaveCount(0)
  })

  test('the test-only user-settings probe is just another unknown URL here', async ({
    page,
  }) => {
    // /user-settings-probe mounts the account-settings modal, but only when
    // the build carries VITE_E2E_USER_SETTINGS_PROBE — which only the sign-in
    // e2e's server sets. This suite doesn't, so the route must be
    // indistinguishable from any other 404. That is what keeps it from being
    // a page in production. (/error-probe is gated the same way and covered by
    // error-fallback.spec.ts.)
    const response = await page.goto('/user-settings-probe')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { level: 1, name: 'page not found' }),
    ).toBeVisible()
  })

  test('the home link returns to /', async ({ page }) => {
    // networkidle + retry: clicking before hydration would fall back to a
    // full load — the known TanStack Start + Playwright timing gap
    // (research/testing-qa/e2e-testing.md).
    await page.goto('/definitely-not-a-page', { waitUntil: 'networkidle' })
    await expect(async () => {
      await page.getByRole('link', { name: 'back to home' }).click()
      await expect(page).toHaveURL('/', { timeout: 1_000 })
    }).toPass()
  })

  test('passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/definitely-not-a-page')
    await expectNoA11yViolations()
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expectNoA11yViolations()
  })
})
