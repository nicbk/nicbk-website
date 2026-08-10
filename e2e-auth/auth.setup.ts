import { test as setup } from '@playwright/test'
import { SIGNED_IN_STORAGE_STATE } from './support/session-state'
import { signInAndLandOn } from './support/sign-in'

/**
 * Signs in once, for the whole tier.
 *
 * Every spec here needs a session and none of them are *about* getting one —
 * before this, all 88 tests drove the full OAuth round trip first: a guarded
 * page, a redirect to `/sign-in`, an SSR render, hydration, a click, the
 * stubbed consent screen, the callback, and a second redirect. Measured on
 * `collection-cards.spec.ts` — five tests whose bodies are "insert a row, look
 * at the card" — that was 56 seconds, about eleven per test, almost none of it
 * assertions.
 *
 * This runs as a Playwright *setup project* that the browser project depends
 * on, so it happens exactly once and every spec starts with the cookie already
 * in the context.
 *
 * **The flow itself is still tested, for real.** `sign-in-flow.spec.ts` opts out
 * of this state and drives the whole round trip, and the two guard-redirect
 * tests opt out to arrive signed out on purpose. What is removed is repetition,
 * not coverage: the thing this file skips 80-odd times is the thing those specs
 * exist to check.
 */
setup('sign in once for the whole tier', async ({ page }) => {
  // Through the guard rather than straight to `/sign-in`, exactly as the specs
  // used to: if this path ever breaks, it breaks here, loudly, before anything
  // else runs.
  await signInAndLandOn(page, '/lit-tracker')

  await page.context().storageState({ path: SIGNED_IN_STORAGE_STATE })
})
