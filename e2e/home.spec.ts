import { expect, test } from './fixtures'

// The axe scan of `/` in both themes lives in shell.spec.ts (it now scans
// the real home content), and no-flash first paint lives in theme.spec.ts —
// not duplicated here.
test.describe('home page', () => {
  test('shows the two content lines and the header', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByText('who: 22 yr old dude from SF Bay Area'),
    ).toBeVisible()
    await expect(
      page.getByText(
        'doing: MLE intern @ Pinterest Labs in SF, MSCS AI @ Stanford',
      ),
    ).toBeVisible()
    await expect(page.locator('header')).toBeVisible()
  })

  test('content renders in both themes', async ({ page }) => {
    // networkidle: the toggle click needs a hydrated page — the known
    // TanStack Start + Playwright timing gap flagged in
    // research/testing-qa/e2e-testing.md.
    await page.goto('/', { waitUntil: 'networkidle' })
    const line = page.getByText('who: 22 yr old dude from SF Bay Area')
    await expect(line).toBeVisible()

    const startTheme = await page.locator('html').getAttribute('data-theme')
    await expect(async () => {
      await page.getByRole('button', { name: 'Toggle theme' }).click()
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-theme',
        startTheme ?? '',
        { timeout: 1_000 },
      )
    }).toPass()
    await expect(line).toBeVisible()
  })
})
