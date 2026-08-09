import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { expect, test, toggleThemeTo } from '../e2e/fixtures'
import {
  closeArticleConnection,
  deleteUploadJobsOf,
  failUploadJobsOf,
  signedInUserId,
} from './support/articles'
import { signInAndLandOn } from './support/sign-in'

/**
 * The upload flow against the real stack: a PDF chosen in a real file picker,
 * posted to the real endpoint, stored in a real Garage, and its job row
 * arriving back on the open page **by sync** rather than in the response.
 *
 * That last part is the point. The endpoint's answer says only what was
 * accepted; the row the popup lists comes from Postgres through zero-cache, so
 * these tests fail if the write happened but the reactive path did not.
 *
 * Nothing resolves a job yet — the extract stage is task 4 — so an uploaded
 * file stays in `processing`. Each test clears its own rows on the way out,
 * because that state would otherwise leak into the next one through the status
 * indicator.
 *
 * Runs before user-settings.spec.ts alphabetically, which matters: that file
 * deletes the shared account on its way out.
 */

const TRACKER = '/lit-tracker'

/** A minimal file that really is a PDF — the server checks the magic bytes. */
function pdfFile(name: string) {
  return {
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(`%PDF-1.7\n% ${randomUUID()}\n%%EOF\n`),
  }
}

/** Not a PDF, and not claiming to be — the declared-type refusal. */
function pngFile(name: string) {
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  }
}

async function openUploadModal(page: Page) {
  await expect(page.getByRole('button', { name: 'Add articles' })).toBeEnabled()
  await page.getByRole('button', { name: 'Add articles' }).click()
  return page.getByLabel(/PDFs/i)
}

/** Submits whatever is selected and waits for the modal to go. */
async function submit(page: Page) {
  await page.getByRole('button', { name: /^upload/ }).click()
}

function jobRows(page: Page) {
  return page.getByRole('list', { name: 'Uploads' }).getByRole('listitem')
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('uploading PDFs', () => {
  test.beforeEach(async ({ page }) => {
    await signInAndLandOn(page, TRACKER)
    await deleteUploadJobsOf(await signedInUserId(page))
  })

  test.afterEach(async ({ page }) => {
    await deleteUploadJobsOf(await signedInUserId(page))
  })

  test('stores a PDF and shows its job live, with no reload', async ({
    page,
  }) => {
    const picker = await openUploadModal(page)
    await picker.setInputFiles(pdfFile('quantum-supremacy.pdf'))
    await submit(page)

    // The modal closes at once: picking and submitting is one action.
    await expect(page.getByLabel(/PDFs/i)).toBeHidden()

    // The indicator is no longer at rest, and the row arrives by sync.
    await page.getByRole('button', { name: 'Uploads in progress' }).click()
    await expect(jobRows(page)).toHaveCount(1)
    await expect(jobRows(page).first()).toContainText('quantum-supremacy.pdf')
  })

  test('produces one row per file of a multi-file submission', async ({
    page,
  }) => {
    const picker = await openUploadModal(page)
    await picker.setInputFiles([
      pdfFile('one.pdf'),
      pdfFile('two.pdf'),
      pdfFile('three.pdf'),
    ])
    await submit(page)

    await expect(page.getByLabel(/PDFs/i)).toBeHidden()
    await page.getByRole('button', { name: 'Uploads in progress' }).click()
    await expect(jobRows(page)).toHaveCount(3)
  })

  test('refuses a non-PDF inline and creates no job', async ({ page }) => {
    const picker = await openUploadModal(page)
    await picker.setInputFiles(pngFile('cat.png'))
    await submit(page)

    // Inline beside the picker, and the modal stays open so the choice can be
    // corrected without starting over.
    await expect(page.getByRole('alert')).toContainText('image/png')
    await expect(page.getByLabel(/PDFs/i)).toBeVisible()

    // Nothing was stored: the indicator is still at rest, which is only true
    // when no job row exists.
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(
      page.getByRole('img', { name: 'All articles synced' }),
    ).toBeVisible()
  })

  test('rejects a whole batch when one file is not a PDF', async ({ page }) => {
    const picker = await openUploadModal(page)
    await picker.setInputFiles([pdfFile('good.pdf'), pngFile('bad.png')])
    await submit(page)

    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(
      page.getByRole('img', { name: 'All articles synced' }),
    ).toBeVisible()
  })
})

test.describe('the upload status indicator', () => {
  test.beforeEach(async ({ page }) => {
    await signInAndLandOn(page, TRACKER)
    await deleteUploadJobsOf(await signedInUserId(page))
  })

  test.afterEach(async ({ page }) => {
    await deleteUploadJobsOf(await signedInUserId(page))
  })

  test('rests as a checkmark that is not a control', async ({ page }) => {
    const synced = page.getByRole('img', { name: 'All articles synced' })
    await expect(synced).toBeVisible()

    // Not merely disabled — there is no button here at all, so it is not in the
    // tab order and cannot be activated to open an empty list.
    await expect(
      page.getByRole('button', { name: /Uploads|attention/ }),
    ).toHaveCount(0)
  })

  test('shows the synced tooltip on hover', async ({ page }) => {
    const indicator = page.getByRole('img', { name: 'All articles synced' })
    // Nothing is showing the text before the hover, so finding it afterwards is
    // the tooltip and not the label leaking into the page.
    await expect(page.getByText('All articles synced')).toHaveCount(0)

    await indicator.hover()

    // Asserted as visible text rather than by `role="tooltip"`: Base UI's
    // tooltip popup carries no such role, and the state is already exposed to
    // assistive technology by the trigger's own accessible name — the tooltip
    // is the sighted-hover affordance on top of that, not the only carrier.
    await expect(page.getByText('All articles synced')).toBeVisible()
  })

  test('switches to the warning state live when a job fails', async ({
    page,
  }) => {
    const picker = await openUploadModal(page)
    await picker.setInputFiles(pdfFile('unreadable.pdf'))
    await submit(page)
    await expect(page.getByLabel(/PDFs/i)).toBeHidden()

    // Task 4's pipeline is what will really do this; writing the row directly
    // exercises the state the component renders, and it arrives by sync exactly
    // as the real one will.
    await failUploadJobsOf(await signedInUserId(page), "couldn't find authors")

    const warning = page.getByRole('button', {
      name: 'Some uploads need attention',
    })
    await expect(warning).toBeVisible()

    await warning.click()
    await expect(jobRows(page).first()).toContainText("couldn't find authors")
    await expect(jobRows(page).first()).toContainText('unreadable.pdf')
  })
})

test.describe('upload surfaces across themes and widths', () => {
  test.beforeEach(async ({ page }) => {
    await signInAndLandOn(page, TRACKER)
    await deleteUploadJobsOf(await signedInUserId(page))
  })

  test.afterEach(async ({ page }) => {
    await deleteUploadJobsOf(await signedInUserId(page))
  })

  for (const width of [320, 768, 1440]) {
    test(`keeps the modal within the viewport at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await openUploadModal(page)

      const popup = page.getByRole('dialog')
      const box = await popup.boundingBox()
      expect(box).not.toBeNull()
      expect(box?.x).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width)

      // The page itself must never scroll sideways.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
    })
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`passes axe with the modal open in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      await toggleThemeTo(page, theme)
      await openUploadModal(page)
      // The popup animates in; a scan taken mid-fade measures a blend that is
      // never a resting state.
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.waitForTimeout(300)

      await expectNoA11yViolations()
    })

    test(`passes axe with the job popup open in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      await toggleThemeTo(page, theme)
      const picker = await openUploadModal(page)
      await picker.setInputFiles(pdfFile('themed.pdf'))
      await submit(page)
      await expect(page.getByLabel(/PDFs/i)).toBeHidden()

      await page.getByRole('button', { name: 'Uploads in progress' }).click()
      await expect(page.getByRole('list', { name: 'Uploads' })).toBeVisible()
      await page.waitForTimeout(300)

      await expectNoA11yViolations()
    })
  }
})
