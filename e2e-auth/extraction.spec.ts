import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { expect, test, toggleThemeTo } from '../e2e/fixtures'
import {
  clearUploadsOf,
  closeArticleConnection,
  signedInUserId,
} from './support/articles'
import { cards } from './support/collection'
import { landOn } from './support/sign-in'

/**
 * The whole chain, in a browser: a PDF picked in a real file picker becomes an
 * article, and its job row disappears, **with no navigation or refresh**.
 *
 * This is the feature's headline behaviour and the only test that exercises
 * every part of it at once — the endpoint, Garage, pg-boss, the worker running
 * inside the app server, and the write coming back out through zero-cache to a
 * page that never asked for it.
 *
 * GROBID itself is stubbed, by pointing `GROBID_URL` at a small server the
 * launcher starts (e2e-auth/support/grobid-stub.mjs). Each uploaded file
 * carries its own instruction for that stub, so one submission can contain a
 * document that extracts and one that cannot. The accepted consequence, stated
 * in this task's testing.md: **e2e never exercises the real GROBID.**
 * Extraction quality against real papers is checked by hand.
 *
 * Runs before user-settings.spec.ts alphabetically, which matters: that file
 * deletes the shared account on its way out.
 */

const TRACKER = '/lit-tracker'

/**
 * Long enough for a job to be picked up and run.
 *
 * pg-boss polls, so resolution is not instant even when everything works, and
 * the assertions below are retrying matchers rather than sleeps — this is only
 * the ceiling on how long they keep retrying
 * (research/testing-qa/e2e-testing.md).
 */
const RESOLVES_IN = 30_000

/** A real PDF by magic bytes, carrying its instruction for the stubbed GROBID. */
function pdfFile(name: string, instruction: object) {
  return {
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(
      `%PDF-1.7\n% ${randomUUID()}\n% grobid-stub ${JSON.stringify(instruction)}\n%%EOF\n`,
    ),
  }
}

/**
 * The article rows — the shared locator, under this spec's own name. It is
 * scoped to the grid's direct children: since #8's second task a card's tag
 * chips are a nested list, so a bare `listitem` count reads high and silently.
 */
const articleEntries = cards

function jobRows(page: Page) {
  return page.getByRole('list', { name: 'Uploads' }).getByRole('listitem')
}

async function uploadFiles(
  page: Page,
  files: ReturnType<typeof pdfFile>[],
): Promise<void> {
  await expect(page.getByRole('button', { name: 'Add articles' })).toBeEnabled()
  await page.getByRole('button', { name: 'Add articles' }).click()
  await page.getByLabel(/PDFs/i).setInputFiles(files)
  await page.getByRole('button', { name: /^upload/ }).click()
  await expect(page.getByLabel(/PDFs/i)).toBeHidden()
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('extraction, end to end', () => {
  test.beforeEach(async ({ page }) => {
    await landOn(page, TRACKER)
    await clearUploadsOf(await signedInUserId(page))
  })

  test.afterEach(async ({ page }) => {
    await clearUploadsOf(await signedInUserId(page))
  })

  test('turns an uploaded PDF into an article, with no reload', async ({
    page,
  }) => {
    await uploadFiles(page, [
      pdfFile('bounded-staleness.pdf', {
        title: 'Bounded Staleness for Single-Node Sync Engines',
        authors: ['Marta Oliveira', 'Rajesh Anand'],
      }),
    ])

    // The article arrives with what GROBID found, not with the filename.
    const article = articleEntries(page).filter({
      hasText: 'Bounded Staleness for Single-Node Sync Engines',
    })
    await expect(article).toHaveCount(1, { timeout: RESOLVES_IN })
    await expect(article).toContainText('Marta Oliveira')

    // …and the job is gone: the row is deleted on resolution rather than
    // marked complete, so the indicator returns to rest on its own.
    await expect(
      page.getByRole('img', { name: 'All articles synced' }),
    ).toBeVisible({ timeout: RESOLVES_IN })
  })

  test('leaves a warning row naming the reason, with its article behind it', async ({
    page,
  }) => {
    await uploadFiles(page, [
      pdfFile('a-scanned-poster.pdf', { fail: 'unreadable' }),
    ])

    const warning = page.getByRole('button', {
      name: 'Some uploads need attention',
    })
    await expect(warning).toBeVisible({ timeout: RESOLVES_IN })

    await warning.click()
    await expect(jobRows(page).first()).toContainText('a-scanned-poster.pdf')
    await expect(jobRows(page).first()).toContainText("couldn't read this PDF")

    // The article exists behind the failure, titled with the filename and with
    // no authors — the decided fallbacks. This is the property #11 depends on:
    // a failed row must have something to open.
    await expect(
      articleEntries(page).filter({ hasText: 'a-scanned-poster.pdf' }),
    ).toHaveCount(1)
  })

  test('resolves several uploads independently', async ({ page }) => {
    await uploadFiles(page, [
      pdfFile('first.pdf', { title: 'The First Paper', authors: ['A Author'] }),
      pdfFile('broken.pdf', { fail: 'unreadable' }),
      pdfFile('second.pdf', {
        title: 'The Second Paper',
        authors: ['B Author'],
      }),
    ])

    // Both good ones arrive even though one in the same submission failed: the
    // stages are per-job, so a failure holds up nothing but itself.
    await expect(
      articleEntries(page).filter({ hasText: 'The First Paper' }),
    ).toHaveCount(1, { timeout: RESOLVES_IN })
    await expect(
      articleEntries(page).filter({ hasText: 'The Second Paper' }),
    ).toHaveCount(1, { timeout: RESOLVES_IN })

    // Exactly one row is left in the popup — the failure, and nothing else.
    const warning = page.getByRole('button', {
      name: 'Some uploads need attention',
    })
    await expect(warning).toBeVisible({ timeout: RESOLVES_IN })
    await warning.click()
    await expect(jobRows(page)).toHaveCount(1)
    await expect(jobRows(page).first()).toContainText('broken.pdf')
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`passes axe with a failed job listed in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      // Newly reachable in this task: until the pipeline could fail a job, the
      // warning row's contrast and its not-by-colour-alone requirement could
      // not be scanned in a real render.
      await toggleThemeTo(page, theme)
      await uploadFiles(page, [
        pdfFile('unreadable.pdf', { fail: 'unreadable' }),
      ])

      const warning = page.getByRole('button', {
        name: 'Some uploads need attention',
      })
      await expect(warning).toBeVisible({ timeout: RESOLVES_IN })
      await warning.click()
      await expect(page.getByRole('list', { name: 'Uploads' })).toBeVisible()
      // The popup animates in; a scan taken mid-fade measures a blend that is
      // never a resting state.
      await page.waitForTimeout(300)

      await expectNoA11yViolations()
    })
  }
})
