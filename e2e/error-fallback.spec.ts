import { expect, test } from './fixtures'

// /error-probe is the test-only forced-throw route (src/routes/error-probe.tsx),
// enabled here via the webServer's VITE_E2E_ERROR_PROBE flag. Hitting it makes a
// descendant throw, which the root errorComponent catches and renders as the
// designed error-fallback page.
test.describe('error-fallback page', () => {
  test('a forced top-level throw renders the designed fallback inside the header', async ({
    page,
  }) => {
    await page.goto('/error-probe')

    // Rendered inside the shared site shell (header present) with the designed
    // plain-text heading and a way home.
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: 'something went wrong' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'back to home' })).toBeVisible()
  })

  test('technical detail is collapsed by default and expands on activation', async ({
    page,
  }) => {
    await page.goto('/error-probe')

    // The disclosure control is present; the error text is in the DOM but
    // hidden while the native <details> is collapsed. (Native <details> toggles
    // without hydration, so no networkidle wait is needed here.)
    const detailText = page.getByText(/e2e error probe/).first()
    await expect(detailText).toBeHidden()

    await page.getByText('technical detail').click()
    await expect(detailText).toBeVisible()
  })

  test('passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/error-probe')
    await expectNoA11yViolations()
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expectNoA11yViolations()
  })
})
