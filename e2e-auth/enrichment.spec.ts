import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { expect, test } from '../e2e/fixtures'
import {
  citationEdgesOf,
  clearUploadsOf,
  closeArticleConnection,
  enrichmentOfArticle,
  signedInUserId,
} from './support/articles'
import { cards } from './support/collection'
import {
  canonicalTitleFor,
  REFERENCE_LIST_ONLY_TITLE,
  STUB_VENUE,
  STUB_YEAR,
} from './support/semantic-scholar-stub.mjs'
import { landOn } from './support/sign-in'

/**
 * The last stage of the chain, in a browser: an upload that also gets enriched,
 * and — the one that matters — an upload whose enrichment fails and that the
 * user never finds out about.
 *
 * The degraded case is the reason this file exists. "Semantic Scholar can never
 * fail an upload" is a property that only breaks under conditions nobody
 * reproduces by hand: the API is a pool shared with every other unauthenticated
 * caller on the internet, and it throttles by current load rather than by
 * quota. Everything looks fine locally, right up until an afternoon when it
 * does not.
 *
 * Both services are stubbed, by pointing `GROBID_URL` and
 * `SEMANTIC_SCHOLAR_URL` at small servers the launcher starts. One directive in
 * the uploaded file chooses the behaviour of both: it names the DOI the GROBID
 * stub will emit, and the Semantic Scholar stub decides what to do from that
 * DOI's shape.
 *
 * Runs before extraction.spec.ts and user-settings.spec.ts alphabetically; the
 * latter deletes the shared account on its way out.
 */

const TRACKER = '/lit-tracker'

/**
 * Long enough for three chained jobs to be polled up and run.
 *
 * Above Playwright's default 30-second budget for a whole test, so the tests
 * below raise their own — the chain gained a stage, and the degraded one waits
 * out a real retry cycle rather than pretending to.
 */
const RESOLVES_IN = 45_000

/** Long enough for enrichment to fail, retry, exhaust and dead-letter. */
const GIVES_UP_IN = 150_000

/** A real PDF by magic bytes, carrying its instruction for both stubs. */
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

/** Waits for the upload indicator to return to rest — the job row is gone. */
async function settles(page: Page): Promise<void> {
  await expect(
    page.getByRole('img', { name: 'All articles synced' }),
  ).toBeVisible({ timeout: RESOLVES_IN })
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('enrichment, end to end', () => {
  test.beforeEach(async ({ page }) => {
    await landOn(page, TRACKER)
    await clearUploadsOf(await signedInUserId(page))
  })

  test.afterEach(async ({ page }) => {
    await clearUploadsOf(await signedInUserId(page))
  })

  test('enriches an upload and lays its bibliography as edges, with no reload', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const userId = await signedInUserId(page)
    await uploadFiles(page, [
      pdfFile('bounded-staleness.pdf', {
        title: 'Bounded Staleness for Single-Node Sync Engines',
        authors: ['Marta Oliveira'],
        doi: '10.5555/known-bounded-staleness',
        references: [
          {
            title: 'A Reference Semantic Scholar Knows',
            authors: ['Ada Byron'],
            doi: '10.5555/known-a-reference',
          },
          { title: REFERENCE_LIST_ONLY_TITLE, authors: ['Grace Hopper'] },
        ],
      }),
    ])

    // What the browser can show: the article arrives live, and the upload
    // settles, with the chain now three stages long.
    const article = articleEntries(page).filter({
      hasText: 'Bounded Staleness for Single-Node Sync Engines',
    })
    await expect(article).toHaveCount(1, { timeout: RESOLVES_IN })
    await settles(page)

    // What only the database can show, because nothing renders it until #8 and
    // #10: the venue and year came from Semantic Scholar — GROBID's stub emits
    // neither — and the article was promoted out of `grobid_only`.
    await expect(async () => {
      expect(
        await enrichmentOfArticle(
          userId,
          'Bounded Staleness for Single-Node Sync Engines',
        ),
      ).toMatchObject({
        extraction_status: 'enriched',
        semantic_scholar_id: 's2-bounded-staleness',
        venue: STUB_VENUE,
        publication_year: STUB_YEAR,
      })
    }).toPass({ timeout: RESOLVES_IN })

    // Both references became edges, and — the part that makes the graph
    // usable — *both* carry a paper id. The second printed no identifier at
    // all; its id came from Semantic Scholar's own reference list for the
    // citing paper, which is how a machine-learning bibliography gets resolved.
    const edges = await citationEdgesOf(userId)
    expect(edges.map((edge) => edge.semantic_scholar_id).sort()).toEqual([
      's2-a-reference',
      's2-known-only-to-the-reference-list',
    ])

    // And the resolved one is stored under Semantic Scholar's title rather than
    // the one the document printed — GROBID keeps year prefixes and trailing
    // venues, and for a reference the API resolved its record is the better one.
    expect(edges.map((edge) => edge.title)).toContain(
      canonicalTitleFor('a-reference'),
    )
  })

  test('still completes the upload when Semantic Scholar is down', async ({
    page,
  }) => {
    // The behaviour most worth locking in. With the stub answering 503, the
    // enrich job fails, is retried, exhausts its retries and lands on its
    // dead-letter queue — from which the upload is finalized anyway. Slow on
    // purpose: this waits out the real retry policy rather than a shortened one,
    // because the policy's length is part of what is being checked.
    test.setTimeout(300_000)
    const userId = await signedInUserId(page)
    await uploadFiles(page, [
      pdfFile('degraded.pdf', {
        title: 'A Paper Nobody Could Enrich',
        authors: ['Marta Oliveira'],
        doi: '10.5555/unavailable',
        references: [{ title: 'A Reference', authors: ['Ada Byron'] }],
      }),
    ])

    // The user's view is identical to a successful upload: the article appears
    // and the indicator returns to rest. No warning row, no failure state.
    await expect(
      articleEntries(page).filter({ hasText: 'A Paper Nobody Could Enrich' }),
    ).toHaveCount(1, { timeout: RESOLVES_IN })
    await expect(
      page.getByRole('button', { name: 'Some uploads need attention' }),
    ).toBeHidden()
    await expect(
      page.getByRole('img', { name: 'All articles synced' }),
    ).toBeVisible({ timeout: GIVES_UP_IN })

    // Degraded rather than failed: a complete, readable article that simply
    // never reached Semantic Scholar.
    expect(
      await enrichmentOfArticle(userId, 'A Paper Nobody Could Enrich'),
    ).toMatchObject({
      extraction_status: 'grobid_only',
      semantic_scholar_id: null,
    })

    // And the bibliography survived, because extraction writes it — losing a
    // paper's references because a public API was busy would be a much worse
    // outcome than an unresolved edge.
    expect(await citationEdgesOf(userId)).toHaveLength(1)
  })
})
