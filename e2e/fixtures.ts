import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'

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

/**
 * Switches the theme the way a reader with no stored preference would: by
 * changing the operating system's, then reloading so the pre-paint script
 * resolves it again.
 *
 * `toggleThemeTo` above is unavailable on Lit-Tracker pages — the theme toggle
 * lives on the site-wide header, and the tracker has its own header
 * (research/ui-ux/pages/lit-tracker/components/header.md). The stored choice a
 * reader makes on the personal site still applies across the whole site, so
 * this drives the other input to `resolveTheme` (src/theme.ts) rather than
 * inventing a toggle the design doesn't have.
 *
 * The reload is what makes this also a no-flash assertion: the theme is applied
 * by a blocking inline script before first paint, so the requested attribute is
 * already correct on the first frame rather than after hydration.
 */
export async function setOsThemeTo(
  page: Page,
  theme: 'light' | 'dark',
): Promise<void> {
  await page.emulateMedia({ colorScheme: theme })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

/**
 * Toggles a tag in the blog's tag filter and waits until it actually reports
 * the requested pressed state.
 *
 * Same hydration race as `toggleThemeTo` above, and the same remedy. It is
 * worth being concrete about why a bare `.click()` right after `page.goto()`
 * is a race rather than an occasional hiccup: the tag toggles are
 * server-rendered, so Playwright finds and clicks a *real, visible, enabled*
 * button well before React has attached any handler to it. Nothing reports an
 * error — the click simply lands on inert markup and is lost.
 *
 * Measured on the dev server this suite runs locally, the gap is roughly
 * 600-900ms: `window.__TSR_ROUTER__` appears around 590ms and React's handlers
 * around 650ms, while clicks only start taking effect around 820ms. CI builds
 * for production and hydrates fast enough that the window rarely opens, which
 * is why this failed locally while CI stayed green.
 *
 * Waiting on a framework internal (a React fiber key, or `__TSR_ROUTER__`) was
 * considered and rejected: the first is private API React has renamed before,
 * and the second was measured landing *before* handlers attach, so it is not
 * actually the signal it looks like. Retrying click-then-assert needs no such
 * knowledge — it observes the only thing the test cares about, which is that
 * the control responded.
 *
 * Asserting the desired end state (rather than "something changed") is what
 * makes retrying safe on a toggle: a click that was swallowed changes nothing
 * and is retried, and a click that landed satisfies the assertion, so no
 * second click is sent.
 */
export async function toggleTagTo(
  page: Page,
  tag: string,
  pressed: boolean,
  { via = 'pointer' }: { via?: 'pointer' | 'keyboard' | 'touch' } = {},
): Promise<Locator> {
  const toggle = page.getByRole('button', { name: tag })
  await expect(async () => {
    // The modality is load-bearing in some of these tests — a tap and a
    // keyboard activation are specified to leave focus in different places —
    // so the caller chooses it rather than getting a click either way.
    if (via === 'keyboard') {
      await toggle.focus()
      await toggle.press('Enter')
    } else if (via === 'touch') {
      await toggle.tap()
    } else {
      await toggle.click()
    }
    await expect(toggle).toHaveAttribute('aria-pressed', String(pressed), {
      timeout: 1_000,
    })
  }).toPass()
  return toggle
}

/**
 * Types a query into the blog's search box and waits until it has actually
 * taken effect.
 *
 * `fill()` has the same pre-hydration hazard as `click()`, and a quieter one:
 * it sets the input's value directly, so the field *looks* filled even when
 * React never saw the event and nothing filtered. A following assertion then
 * measures an unfiltered list against a value that is visibly there, which
 * reads as a product bug rather than a lost event.
 *
 * Settling is judged by the URL, since the query is mirrored there (debounced
 * ~250ms) only by the handler that hydration attaches — so a URL carrying the
 * query is proof the input was really processed, not just populated.
 */
export async function searchPostsFor(
  page: Page,
  query: string,
): Promise<Locator> {
  const search = page.getByRole('searchbox', { name: 'Search posts' })
  await expect(async () => {
    await search.fill(query)
    await expect(page).toHaveURL(
      new RegExp(`[?&]q=${encodeURIComponent(query)}\\b`),
      { timeout: 2_000 },
    )
  }).toPass()
  return search
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
