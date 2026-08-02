import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type Page } from '@playwright/test'

/**
 * Clicks the header's theme toggle and waits until the theme has actually
 * changed.
 *
 * Clicks that land before React hydrates are silently dropped — the known
 * TanStack Start + Playwright timing gap flagged in
 * research/testing-qa/e2e-testing.md — so a bare `.click()` followed by an
 * assertion is a race. Retrying click-then-assert is the documented way around
 * it; this is that, named once so tests don't each have to remember.
 */
export async function toggleThemeTo(
  page: Page,
  theme: 'light' | 'dark',
): Promise<void> {
  await expect(async () => {
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme, {
      timeout: 1_000,
    })
  }).toPass()

  // The attribute flips instantly; the colors it changes do not — controls
  // that transition color/border spend ~150ms somewhere between the two
  // palettes (src/styles/motion.css). A contrast check run during that window
  // measures a blend that is never a resting state, which is a real source of
  // flaky axe failures. Waiting for every running transition to finish makes
  // "the theme is dark" mean the page actually looks dark.
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) =>
        // A transition interrupted by another one rejects; that is fine, it
        // means something newer is already being waited on.
        animation.finished.catch(() => undefined),
      ),
    ),
  )
}

interface AxeFixture {
  /**
   * Shared inline axe scan (research/testing-qa/accessibility-testing.md):
   * WCAG 2.2 AA rule set, failing the test only on critical/serious
   * violations — moderate/minor findings are logged, not blocking.
   */
  expectNoA11yViolations: () => Promise<void>
}

export const test = base.extend<AxeFixture>({
  expectNoA11yViolations: async ({ page }, use) => {
    await use(async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === 'critical' || violation.impact === 'serious',
      )
      const logged = results.violations.filter(
        (violation) => !blocking.includes(violation),
      )
      if (logged.length > 0) {
        console.warn(
          `axe (non-blocking): ${logged.map((v) => v.id).join(', ')}`,
        )
      }
      expect(blocking.map((v) => `${v.id}: ${v.description}`)).toEqual([])
    })
  },
})

export { expect } from '@playwright/test'
