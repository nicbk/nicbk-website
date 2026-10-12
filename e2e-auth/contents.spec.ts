import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { expect, test } from '../e2e/fixtures'
import {
  clearUploadsOf,
  closeArticleConnection,
  contentsOfArticle,
  signedInUserId,
} from './support/articles'
import { landOn } from './support/sign-in'

/**
 * A paper's contents, found by the upload pipeline
 * (features/a-paper-shows-its-contents, task `the-contents-are-read`).
 *
 * The whole chain, against the real worker: the stored PDF read back, its own
 * outline read by the PDF engine the server bundles — which in CI is the
 * production build, where that engine's WebAssembly has to be shipped as a
 * server asset — and GROBID's numbered headings as the fallback, through the
 * stub. Checked in the database: the tab that shows them is the next task.
 */

const TRACKER = '/lit-tracker'
const READ_IN = 45_000

/** The synthetic three-page fixture with a nested outline, with its directive. */
async function outlinedPdf(title: string) {
  const fixture = await readFile(
    new URL(
      '../src/lit-tracker/contents/fixtures/outlined.pdf',
      import.meta.url,
    ),
  )
  return {
    name: 'outlined.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.concat([
      fixture,
      Buffer.from(
        `\n% grobid-stub ${JSON.stringify({ title, authors: ['Ada Reader'] })}\n`,
      ),
    ]),
  }
}

/** A file that is a PDF by its magic bytes and nothing more, so no outline. */
function bareFile(instruction: object) {
  return {
    name: 'bare.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(
      `%PDF-1.7\n% ${randomUUID()}\n% grobid-stub ${JSON.stringify(instruction)}\n%%EOF\n`,
    ),
  }
}

async function upload(
  page: Page,
  file: Awaited<ReturnType<typeof outlinedPdf>>,
) {
  await expect(page.getByRole('button', { name: 'Add articles' })).toBeEnabled()
  await page.getByRole('button', { name: 'Add articles' }).click()
  await page.getByLabel(/PDFs/i).setInputFiles(file)
  await page.getByRole('button', { name: /^upload/ }).click()
  await expect(page.getByLabel(/PDFs/i)).toBeHidden()
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('the contents are read', () => {
  test.beforeEach(async ({ page }) => {
    await landOn(page, TRACKER)
    await clearUploadsOf(await signedInUserId(page))
  })

  test.afterEach(async ({ page }) => {
    await clearUploadsOf(await signedInUserId(page))
  })

  test('from the PDF’s own outline', async ({ page }) => {
    const userId = await signedInUserId(page)
    const title = `An Outlined Paper ${randomUUID()}`
    await upload(page, await outlinedPdf(title))

    await expect
      .poll(() => contentsOfArticle(userId, title), { timeout: READ_IN })
      .toMatchObject({
        source: 'outline',
        entries: [
          { title: '1 Introduction', depth: 1, pageIndex: 0 },
          { title: '1.1 Background', depth: 2, pageIndex: 1 },
          { title: '2 Method', depth: 1, pageIndex: 2 },
        ],
      })
  })

  test('from GROBID’s numbered headings, without an outline', async ({
    page,
  }) => {
    const userId = await signedInUserId(page)
    const title = `A Paper With Headings ${randomUUID()}`
    await upload(
      page,
      bareFile({
        title,
        authors: ['Ada Reader'],
        sections: [
          { n: '1', title: 'Introduction', page: 1, top: 120 },
          { n: '1.1', title: 'Scope', page: 2, top: 90 },
        ],
      }),
    )

    await expect
      .poll(() => contentsOfArticle(userId, title), { timeout: READ_IN })
      .toEqual({
        source: 'headings',
        entries: [
          { title: '1 Introduction', depth: 1, pageIndex: 0, top: 120 },
          { title: '1.1 Scope', depth: 2, pageIndex: 1, top: 90 },
        ],
      })
  })

  // A PDF the engine cannot open, and no headings to fall back on: the paper
  // is still finished, and the row says the read failed.
  test('says it could not read them, without failing the upload', async ({
    page,
  }) => {
    const userId = await signedInUserId(page)
    const title = `An Unreadable Paper ${randomUUID()}`
    await upload(page, bareFile({ title, authors: ['Ada Reader'] }))

    await expect
      .poll(() => contentsOfArticle(userId, title), { timeout: READ_IN })
      .toEqual({ source: 'failed', entries: [] })
  })
})
