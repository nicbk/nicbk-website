import { expect, test } from './fixtures'

// The e2e half of the design-system-foundation task's testing.md, deferred
// to this task (no pages existed to assert against before the shell).
test.describe('theming', () => {
  test('first paint has the OS-preferred theme with no post-hydration flip', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    // The attribute is set by the pre-paint inline script; if it were
    // corrected after hydration instead, this immediate read would flake.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('a toggled theme persists across reload regardless of OS preference', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/', { waitUntil: 'networkidle' })
    // Clicks before React hydrates are silently dropped — the known
    // TanStack Start + Playwright timing gap flagged in
    // research/testing-qa/e2e-testing.md — so retry click-then-assert
    // until the attribute actually flips.
    await expect(async () => {
      await page.getByRole('button', { name: 'Toggle theme' }).click()
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        'light',
        { timeout: 1_000 },
      )
    }).toPass()

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})
