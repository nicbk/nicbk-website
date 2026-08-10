import type { Locator, Page } from '@playwright/test'
import { expect, test, toggleThemeTo } from '../e2e/fixtures'
import {
  applyTagTo,
  closeArticleConnection,
  deleteArticlesOf,
  deleteTagsOf,
  insertArticle,
  insertTag,
  signedInUserId,
} from './support/articles'
import { cards } from './support/collection'
import { landOn } from './support/sign-in'

/**
 * The search bar, infinite scroll, and the toolbar row that holds them.
 *
 * The predicate behind the search is unit-tested and needs no browser. What only
 * a browser can settle is the rest: that typing narrows the grid without a
 * submit or a round trip, that the query and the rail's selections land in one
 * URL that survives a reload, that a collection longer than a batch reveals as
 * it is scrolled — and the layout claim, which is that the "+" and the upload
 * indicator sit against the search bar's trailing edge at every width rather
 * than at the far edge of the panel.
 *
 * Runs between collection-filters.spec.ts and collection-tags.spec.ts
 * alphabetically, and well before user-settings.spec.ts, which deletes the
 * shared account on its way out.
 */

const TRACKER = '/lit-tracker'

/** Three papers with nothing in common but their subject matter. */
const ATTENTION = 'Attention Is All You Need'
const RESNET = 'Deep Residual Learning for Image Recognition'
const INSTRUCT = 'Training Language Models to Follow Instructions'

/** More articles than one reveal batch, so scrolling has something to do. */
const LONG_COLLECTION = 20

/** The first batch, as `article-collection.tsx` sets it. */
const REVEAL_STEP = 12

function searchBox(page: Page): Locator {
  return page.getByRole('searchbox', { name: 'Search articles' })
}

/**
 * The whole search control — the rounded pill, not the `<input>` inside it.
 *
 * What the layout assertions have to measure: the input starts after the pill's
 * border, its padding, and the magnifier, so measuring it reports the field as
 * ~39px narrower and further right than it looks. The first draft of the
 * alignment test did exactly that and failed on a layout that was correct.
 */
function searchField(page: Page): Locator {
  return searchBox(page).locator('..')
}

/**
 * Types a query and waits for it to have really landed.
 *
 * `fill` sets the value directly, so before React has hydrated the field looks
 * filled while nothing saw the event — the quiet half of the hydration gap
 * recorded in research/testing-qa/e2e-testing.md. Waiting for the URL to carry
 * the query proves the app processed it, and retrying is safe because the
 * assertion names the end state: a swallowed keystroke changed nothing.
 */
async function searchFor(page: Page, query: string): Promise<void> {
  // `encodeURIComponent` is the wrong encoder for a query *value*: the router
  // writes a space as `+`, the `application/x-www-form-urlencoded` form, where
  // that function produces `%20`.
  const encoded = encodeURIComponent(query).replaceAll('%20', '\\+')

  await expect(async () => {
    await searchBox(page).fill(query)
    await expect(page).toHaveURL(new RegExp(`[?&]q=${encoded}\\b`), {
      timeout: 2_000,
    })
  }).toPass()
}

/**
 * Empties the field and waits for the query to be gone from the URL.
 *
 * Its own helper for the same reason `searchFor` is one, and not a theoretical
 * one: a bare `fill('')` was seen to leave the grid still narrowed — the event
 * went nowhere, the field looked empty, and the following assertion measured a
 * filtered collection against a query that was plainly not there any more.
 */
async function clearSearch(page: Page): Promise<void> {
  await expect(async () => {
    await searchBox(page).fill('')
    await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 2_000 })
  }).toPass()
}

/** A signed-in page holding three papers, one of them tagged. */
async function seededCollection(page: Page): Promise<{ userId: string }> {
  await landOn(page, TRACKER)
  const userId = await signedInUserId(page)
  await deleteArticlesOf(userId)
  await deleteTagsOf(userId)

  const attention = await insertArticle(userId, {
    title: ATTENTION,
    authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
    publicationYear: 2017,
  })
  await insertArticle(userId, {
    title: RESNET,
    authors: [{ name: 'Kaiming He' }],
    publicationYear: 2016,
  })
  await insertArticle(userId, {
    title: INSTRUCT,
    authors: [{ name: 'Long Ouyang' }],
    publicationYear: 2022,
  })

  const transformers = await insertTag(userId, 'transformers')
  await applyTagTo(attention.id, transformers.id)

  await expect(cards(page)).toHaveCount(3)
  return { userId }
}

/** A signed-in page holding more articles than a single reveal batch. */
async function longCollection(page: Page): Promise<void> {
  await landOn(page, TRACKER)
  const userId = await signedInUserId(page)
  await deleteArticlesOf(userId)
  await deleteTagsOf(userId)

  for (let index = 0; index < LONG_COLLECTION; index += 1) {
    await insertArticle(userId, {
      // Numbered from the end so the titles sort the way they arrive; what
      // matters is only that each is distinct and searchable.
      title: `Paper number ${String(index).padStart(2, '0')}`,
      authors: [{ name: 'A. Researcher' }],
      publicationYear: 2020,
    })
  }

  await expect(cards(page)).toHaveCount(REVEAL_STEP)
}

/** Scrolls the panel — the collection's scroll container — to its end. */
async function scrollPanelToEnd(page: Page): Promise<void> {
  await page
    .getByRole('main')
    .evaluate((panel) => panel.scrollTo({ top: panel.scrollHeight }))
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('collection search', () => {
  test('narrows the grid as the query is typed, and restores it when cleared', async ({
    page,
  }) => {
    await seededCollection(page)

    await searchFor(page, 'residual')
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText(RESNET)

    // No submit anywhere in that: the field has no form and no button, and the
    // rows never left the client.
    await clearSearch(page)
    await expect(cards(page)).toHaveCount(3)
    await expect(page).toHaveURL(TRACKER)
  })

  test('finds an article by an author the card does not even name', async ({
    page,
  }) => {
    // The card shows "Vaswani et al." — Shazeer is in the data and nowhere on
    // screen, which is exactly the case a search bar exists for.
    await seededCollection(page)

    await searchFor(page, 'shazeer')

    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText(ATTENTION)
  })

  test('finds an article by a tag, and by its reading status', async ({
    page,
  }) => {
    await seededCollection(page)

    await searchFor(page, 'transformers')
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText(ATTENTION)

    // Nothing has set a status, so all three are pending — statuses are
    // searchable because the decided model presents them as tags.
    await searchFor(page, 'pending')
    await expect(cards(page)).toHaveCount(3)
  })

  test('says nothing matches, rather than that the collection is empty', async ({
    page,
  }) => {
    await seededCollection(page)

    await searchFor(page, 'photosynthesis')

    await expect(page.getByText('no articles match.')).toBeVisible()
    await expect(page.getByText('no articles yet.')).toHaveCount(0)
  })

  test('composes with a rail selection, and the whole state survives a reload', async ({
    page,
  }) => {
    await seededCollection(page)

    // The tag alone keeps one paper; a query that matches a *different* one
    // must leave nothing rather than reopening what the rail excluded.
    await page
      .getByRole('button', { name: 'transformers', exact: true })
      .click()
    await expect(cards(page)).toHaveCount(1)

    await searchFor(page, 'residual')
    await expect(cards(page)).toHaveCount(0)

    await searchFor(page, 'vaswani')
    await expect(cards(page)).toHaveCount(1)

    // One URL carries both, and both come back out of it.
    await expect(page).toHaveURL(/tags=/)
    await page.reload()
    await expect(searchBox(page)).toHaveValue('vaswani')
    await expect(
      page.getByRole('button', { name: 'transformers', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(cards(page)).toHaveCount(1)
  })

  test('reveals the rest of a long collection as it is scrolled', async ({
    page,
  }) => {
    // Revealing, not fetching: every row is already synced. What scrolling
    // changes is how many are drawn.
    await page.setViewportSize({ width: 1280, height: 720 })
    await longCollection(page)

    await scrollPanelToEnd(page)
    await expect(cards(page)).toHaveCount(LONG_COLLECTION)
    await expect(
      cards(page).filter({ hasText: `Paper number ${LONG_COLLECTION - 1}` }),
    ).toHaveCount(1)
  })

  test('keeps the toolbar in place while the collection scrolls under it', async ({
    page,
  }) => {
    /*
     * The problem infinite scroll creates and this fixes, found by scrolling the
     * real page rather than by any test: with the row scrolling away, a reader
     * twenty cards down had to go all the way back to the top to search, or to
     * add anything. That is the same reasoning that put the filters in a drawer
     * instead of under the content on a narrow screen — a control below a list
     * that never ends is a control nobody reaches.
     */
    await page.setViewportSize({ width: 1280, height: 720 })
    await longCollection(page)

    const before = await searchBox(page).boundingBox()
    await scrollPanelToEnd(page)
    await expect(cards(page)).toHaveCount(LONG_COLLECTION)
    const after = await searchBox(page).boundingBox()

    // Not merely "still visible": it has not moved by a pixel, so it is where
    // the reader last saw it rather than somewhere it slid to.
    expect(after?.y).toBe(before?.y)
    await expect(searchBox(page)).toBeInViewport()
    await expect(
      page.getByRole('button', { name: 'Add articles' }),
    ).toBeInViewport()

    // The row itself stays transparent — the collection is meant to be visibly
    // passing behind it, not disappearing under a band. Each control carries its
    // own fill, which is what keeps them legible against moving cards.
    // input → the pill → the field root → the row itself.
    const toolbarBackground = await searchField(page)
      .locator('..')
      .locator('..')
      .evaluate((row) => getComputedStyle(row).backgroundColor)
    expect(toolbarBackground).toBe('rgba(0, 0, 0, 0)')
  })

  test('reveals the filtered set, so a search does not strand rows', async ({
    page,
  }) => {
    // The composition that makes reveal and search agree: what gets revealed is
    // what the filters left, not a window onto the whole collection.
    await page.setViewportSize({ width: 1280, height: 720 })
    await longCollection(page)

    // "number 1" matches 10 through 19 — ten of twenty, fewer than a batch, so
    // all of them draw at once with nothing left to scroll to. (Not "number
    // 01": the titles are zero-padded, so the single digits do not match.)
    await searchFor(page, 'number 1')
    await expect(cards(page)).toHaveCount(10)

    // And clearing it goes back to a full first batch rather than to ten.
    await clearSearch(page)
    await expect(cards(page)).toHaveCount(REVEAL_STEP)
  })

  for (const width of [390, 820, 1280]) {
    test(`keeps the controls against the search bar at ${width}px`, async ({
      page,
    }) => {
      /*
       * The layout claim this task is judged on. The controls hang off the
       * search bar's trailing edge and move with it — they do not sit at the far
       * edge of the content column with a corridor of empty space between.
       */
      await page.setViewportSize({ width, height: 844 })
      await seededCollection(page)

      const field = await searchField(page).boundingBox()
      const plus = await page
        .getByRole('button', { name: 'Add articles' })
        .boundingBox()
      if (field === null || plus === null) {
        throw new Error('the toolbar did not render')
      }

      // Below the breakpoint a "filters" button joins the group and comes
      // first, so the nearest control is whichever is leftmost.
      const filters = page.getByRole('button', { name: 'filters' })
      const filtersBox = (await filters.isVisible())
        ? await filters.boundingBox()
        : null
      const nearest = Math.min(plus.x, filtersBox?.x ?? plus.x)

      // One `--space-sm` (12px), the row's own gap — not a corridor.
      const gap = nearest - (field.x + field.width)
      expect(gap).toBeGreaterThanOrEqual(0)
      expect(gap).toBeLessThanOrEqual(16)

      // No horizontal overflow at any of the three widths.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
    })
  }

  test('centres the whole cluster in a wide row', async ({ page }) => {
    // The other half of the same claim, and the one that fails if the input is
    // simply told to fill the row: on a wide panel an uncapped field pushes the
    // "+" a thousand pixels from the search bar it belongs to. Capped, the
    // group has slack — and the slack is split evenly, so the cluster sits in
    // the middle of the column rather than against one edge of it.
    await page.setViewportSize({ width: 1600, height: 900 })
    await seededCollection(page)

    // Measured from the row's own edges to its first and last child, rather
    // than from named controls: the trailing end of the cluster is the upload
    // indicator, not the "+", and a test that assumed otherwise would report a
    // centred row as 36px off.
    const { leadingSlack, trailingSlack } = await searchField(page)
      .locator('..')
      .locator('..')
      .evaluate((row) => {
        const rowRect = row.getBoundingClientRect()
        const first = row.firstElementChild?.getBoundingClientRect()
        const last = row.lastElementChild?.getBoundingClientRect()
        if (first === undefined || last === undefined) {
          throw new Error('the toolbar row is empty')
        }
        return {
          leadingSlack: first.left - rowRect.left,
          trailingSlack: rowRect.right - last.right,
        }
      })

    // Real slack on both sides — not a cluster that merely happens to fit.
    expect(leadingSlack).toBeGreaterThan(100)
    expect(Math.abs(leadingSlack - trailingSlack)).toBeLessThanOrEqual(2)
  })

  test('still opens the upload dialog from its new position', async ({
    page,
  }) => {
    // This task moved the control; #7's behaviour must be untouched.
    await seededCollection(page)

    await page.getByRole('button', { name: 'Add articles' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`passes axe with the search active in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      await seededCollection(page)
      await toggleThemeTo(page, theme)

      await searchFor(page, 'attention')
      await expect(cards(page)).toHaveCount(1)

      await expectNoA11yViolations()
    })
  }

  test('keeps focus in the field while the grid narrows beneath it', async ({
    page,
  }) => {
    // Filtering must not steal focus: a reader who typed one letter too many
    // has to be able to delete it without finding the field again.
    await seededCollection(page)

    await searchBox(page).click()
    await page.keyboard.type('residual')
    await expect(cards(page)).toHaveCount(1)

    await expect(searchBox(page)).toBeFocused()

    await page.keyboard.press('Backspace')
    await expect(searchBox(page)).toHaveValue('residua')
    await expect(searchBox(page)).toBeFocused()
  })
})
