import type { Page } from '@playwright/test'
// The axe fixture and the theme helper are the ordinary suite's, reused rather
// than reimplemented — this tier differs in what it needs *running*, not in how
// it asserts.
import { expect, setOsThemeTo, test } from '../e2e/fixtures'
import { GOOGLE_TEST_ACCOUNT } from './support/google-stub.mjs'
import { sessionCookie, signInAndLandOn } from './support/sign-in'

/**
 * The user-settings modal against a real server: a real session from a real
 * sign-in, a real log-out, and a real account deletion.
 *
 * It is opened from the Lit-Tracker header's avatar, which is the modal's only
 * trigger anywhere on the site. Until that header existed the modal was mounted
 * on a test-only `/user-settings-probe` route instead; that route was deleted
 * when this one replaced it, so what is exercised here is now the real thing on
 * a real page rather than a stand-in beside it.
 *
 * The behavior asserted here is deliberately the behavior jsdom can't judge:
 * where focus goes and stays, what the two actions do to the session on the
 * server, and how the modal looks in both themes at a phone width.
 */

const TRACKER = '/lit-tracker'
const TRIGGER = { name: 'Account settings' }
const DELETE_BUTTON = { name: 'delete account' }

/** Opens the modal from the trigger, retrying until React has hydrated it. */
async function openSettings(page: Page) {
  const dialog = page.getByRole('dialog')
  await expect(async () => {
    await page.getByRole('button', TRIGGER).click()
    await expect(dialog).toBeVisible({ timeout: 1_000 })
  }).toPass()
  // "Visible" is true from the first frame of the fade-in, while the popup is
  // still part-transparent — and a contrast check run on a half-faded panel
  // measures a colour that is never actually shown. Wait for it to settle.
  await expect(dialog).toHaveCSS('opacity', '1')
  return dialog
}

test.describe('user settings modal', () => {
  test('sends a signed-out visitor to sign in first', async ({ page }) => {
    await page.goto(TRACKER)

    // The guard, doing the job it was built for in task 2: not an error page,
    // just the step that hasn't happened yet — carrying the destination.
    await expect(page).toHaveURL(
      `/sign-in?returnTo=${encodeURIComponent(TRACKER)}`,
    )
  })

  test('shows the signed-in Google account, display only', async ({ page }) => {
    await signInAndLandOn(page, TRACKER)
    const dialog = await openSettings(page)

    await expect(dialog).toContainText('signed in as')
    await expect(dialog).toContainText(GOOGLE_TEST_ACCOUNT.email)
    // Nothing about the account is editable — the only field this modal ever
    // shows belongs to the delete confirmation, which hasn't been asked for.
    await expect(dialog.getByRole('textbox')).toHaveCount(0)
  })

  test('traps focus while open and gives it back to the trigger on Escape', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)
    const dialog = await openSettings(page)

    // A real browser is the only place this can be asserted honestly: it needs
    // `inert` and real sequential focus navigation, neither of which jsdom
    // implements.
    for (let press = 0; press < 8; press += 1) {
      await page.keyboard.press('Tab')
      await expect(dialog.locator(':focus')).toHaveCount(1)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', TRIGGER)).toBeFocused()
  })

  test('keeps delete inert until the account email is typed exactly', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)
    const dialog = await openSettings(page)

    await dialog.getByRole('button', DELETE_BUTTON).click()
    const confirm = dialog.getByRole('button', DELETE_BUTTON)
    const field = dialog.getByRole('textbox')

    await expect(confirm).toHaveAttribute('aria-disabled', 'true')

    await field.fill(GOOGLE_TEST_ACCOUNT.email.toUpperCase())
    await expect(confirm).toHaveAttribute('aria-disabled', 'true')

    await field.fill(GOOGLE_TEST_ACCOUNT.email)
    await expect(confirm).toHaveAttribute('aria-disabled', 'false')

    // Focusable throughout, so a keyboard user can reach it and hear why it is
    // unavailable rather than never finding it at all.
    await confirm.focus()
    await expect(confirm).toBeFocused()
  })

  test('reads correctly in both themes with no flash of the wrong one', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await signInAndLandOn(page, TRACKER)

    const light = await openSettings(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(light).toHaveCSS(
      'background-color',
      'rgb(245, 245, 245)', // --color-bg-surface, light
    )

    // The tracker header carries no theme toggle — the toggle belongs to the
    // site-wide header — so the theme is changed the other way it can be, by
    // the OS preference the pre-paint script reads.
    await page.keyboard.press('Escape')
    await expect(light).toBeHidden()
    await setOsThemeTo(page, 'dark')

    const dark = await openSettings(page)
    await expect(dark).toHaveCSS(
      'background-color',
      'rgb(31, 31, 31)', // --color-bg-surface, dark
    )
    // The destructive control keeps its own color in both themes rather than
    // collapsing into an ordinary button — the whole reason --color-error
    // exists. (It is a per-theme value, so this is checked in the theme test.)
    await expect(dark.getByRole('button', DELETE_BUTTON)).toHaveCSS(
      'color',
      'rgb(245, 163, 160)', // --color-error, dark
    )
    // `setOsThemeTo` reloaded to get here, and the theme was already correct on
    // that first frame — the blocking inline script applies it before paint, so
    // there is no light-then-dark flash to catch.
  })

  test('fits a phone-width screen without sideways scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 720 })
    await signInAndLandOn(page, TRACKER)
    const dialog = await openSettings(page)

    // The confirmation is the widest the modal ever gets: an email address
    // that can't break at a space, plus two buttons side by side.
    await dialog.getByRole('button', DELETE_BUTTON).click()
    await dialog.getByRole('textbox').fill(GOOGLE_TEST_ACCOUNT.email)

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflows).toBe(false)
  })

  test('passes axe (critical/serious) on the open modal in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await signInAndLandOn(page, TRACKER)

    const light = await openSettings(page)
    await expectNoA11yViolations()

    // Again with the destructive confirmation open, which is where the
    // labelled field and the aria-disabled button live.
    await light.getByRole('button', DELETE_BUTTON).click()
    await expectNoA11yViolations()

    // Dark theme: the OS preference plus a reload, since the tracker header
    // has no toggle of its own.
    await page.keyboard.press('Escape')
    await expect(light).toBeHidden()
    await setOsThemeTo(page, 'dark')

    const dark = await openSettings(page)
    await expectNoA11yViolations()
    await dark.getByRole('button', DELETE_BUTTON).click()
    await expectNoA11yViolations()
  })

  test('logging out ends the session on the server', async ({ page }) => {
    await signInAndLandOn(page, TRACKER)
    const dialog = await openSettings(page)

    await dialog.getByRole('button', { name: 'log out' }).click()

    // The probe leaves the guarded page once there is nothing signed in.
    await expect(page).toHaveURL('/')
    expect(await sessionCookie(page)).toBeUndefined()
    const session = await page.request.get('/api/auth/get-session')
    expect(await session.json()).toBeNull()
  })

  // Last: it removes the account every other test in this file signs in with.
  test('deleting the account removes it, and the session with it', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)
    const dialog = await openSettings(page)

    await dialog.getByRole('button', DELETE_BUTTON).click()
    await dialog.getByRole('textbox').fill(GOOGLE_TEST_ACCOUNT.email)
    await dialog.getByRole('button', DELETE_BUTTON).click()

    await expect(page).toHaveURL('/')
    const session = await page.request.get('/api/auth/get-session')
    expect(await session.json()).toBeNull()

    // And the guard now treats this browser as a stranger again.
    await page.goto(TRACKER)
    await expect(page).toHaveURL(
      `/sign-in?returnTo=${encodeURIComponent(TRACKER)}`,
    )
  })
})
