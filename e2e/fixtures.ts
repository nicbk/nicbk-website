import AxeBuilder from '@axe-core/playwright'
import { test as base, expect } from '@playwright/test'

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
