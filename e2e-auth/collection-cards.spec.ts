import type { Locator, Page } from '@playwright/test'
import { expect, test } from '../e2e/fixtures'
import {
  closeArticleConnection,
  deleteArticlesOf,
  insertArticle,
  signedInUserId,
} from './support/articles'
import { signInAndLandOn } from './support/sign-in'

/**
 * The collection as cards, against the real stack.
 *
 * What is worth exercising in a browser rather than in jsdom is everything the
 * component test cannot see: that the metadata #7's pipeline extracted actually
 * arrives through Zero and lands on the card, and that the grid really does
 * collapse to one column — a claim about layout that no unit test can make,
 * since jsdom has no layout at all.
 *
 * Runs before lit-tracker.spec.ts alphabetically, and well before
 * user-settings.spec.ts, which deletes the shared account on its way out.
 */

const TRACKER = '/lit-tracker'

/** The article cards, scoped to their own list — the header's path is a list too. */
function cards(page: Page): Locator {
  return page.getByRole('list', { name: 'Articles' }).getByRole('listitem')
}

/** A signed-in page on the tracker with an empty collection to seed into. */
async function emptyCollection(page: Page): Promise<string> {
  await signInAndLandOn(page, TRACKER)
  const userId = await signedInUserId(page)
  await deleteArticlesOf(userId)
  return userId
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('collection cards', () => {
  test('shows the title, authors, year, and venue extraction produced', async ({
    page,
  }) => {
    const userId = await emptyCollection(page)
    await insertArticle(userId, {
      title: 'Attention Is All You Need',
      authors: [
        { name: 'Ashish Vaswani' },
        { name: 'Noam Shazeer' },
        { name: 'Niki Parmar' },
      ],
      publicationYear: 2017,
      venue: 'Advances in Neural Information Processing Systems',
    })

    const card = cards(page)
    await expect(card).toHaveCount(1)
    // The heading matters as much as the text: it is how a screen-reader user
    // moves between articles.
    await expect(
      card.getByRole('heading', { name: 'Attention Is All You Need' }),
    ).toBeVisible()
    await expect(card).toContainText('Ashish Vaswani et al.')
    await expect(card).toContainText('2017')
    await expect(card).toContainText(
      'Advances in Neural Information Processing Systems',
    )
  })

  test('draws no meta line for a preprint with neither year nor venue', async ({
    page,
  }) => {
    // Most of this collection is preprints, so this is the ordinary case rather
    // than an edge one — and an empty row where the venue would go is exactly
    // the kind of thing that looks fine in a unit test and wrong on a screen.
    const userId = await emptyCollection(page)
    await insertArticle(userId, {
      title: 'Local-First Software Revisited',
      authors: [{ name: 'Ada Fenwick' }],
    })

    const card = cards(page)
    await expect(card).toHaveText('Local-First Software RevisitedAda Fenwick')
  })

  test('lays out multiple columns when there is room and one when there is not', async ({
    page,
  }) => {
    const userId = await emptyCollection(page)
    await insertArticle(userId, { title: 'First paper' })
    await insertArticle(userId, { title: 'Second paper' })
    await expect(cards(page)).toHaveCount(2)

    await page.setViewportSize({ width: 1440, height: 900 })
    const wide = await cardBoxes(page)
    // Side by side: same row, different columns.
    expect(wide[0]?.y).toBe(wide[1]?.y)
    expect(wide[0]?.x).not.toBe(wide[1]?.x)

    await page.setViewportSize({ width: 360, height: 720 })
    const narrow = await cardBoxes(page)
    // Stacked: same column, different rows. This is the grid's `auto-fill`
    // floor doing the collapsing, not a breakpoint — so it also holds at widths
    // nobody picked.
    expect(narrow[0]?.x).toBe(narrow[1]?.x)
    expect(narrow[0]?.y).not.toBe(narrow[1]?.y)
  })

  test('gives every card the same size, whatever its text', async ({
    page,
  }) => {
    // The collection is a grid, not an arrangement of boxes: a paper with a
    // long title and a venue nobody abbreviates occupies exactly the cell a
    // three-word title does, and the text that does not fit is elided instead
    // of pushing the card out of shape.
    const userId = await emptyCollection(page)
    await insertArticle(userId, { title: 'Short' })
    await insertArticle(userId, {
      title:
        'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
      authors: [{ name: 'Jacob Devlin' }, { name: 'Ming-Wei Chang' }],
      publicationYear: 2019,
      venue:
        'North American Chapter of the Association for Computational Linguistics',
    })

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(cards(page)).toHaveCount(2)
    const [first, second] = await cardBoxes(page)

    expect(second?.width).toBe(first?.width)
    expect(second?.height).toBe(first?.height)
    // And the long title really is being cut off rather than fitting by luck —
    // otherwise the equal heights above would prove nothing.
    const longTitle = page.getByRole('heading', { name: /^BERT/ })
    const clipped = await longTitle.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    )
    expect(clipped).toBe(true)
    // Elided on screen, complete to a screen reader and on hover.
    await expect(longTitle).toHaveAttribute(
      'title',
      'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    )
  })

  test('offers nothing on a card to click', async ({ page }) => {
    // #9 owns navigation to the article detail page. Until it exists the card
    // must not look interactive: a click target that does nothing is worse than
    // no click target at all.
    const userId = await emptyCollection(page)
    await insertArticle(userId, { title: 'Attention Is All You Need' })
    await expect(cards(page)).toHaveCount(1)

    const list = page.getByRole('list', { name: 'Articles' })
    await expect(list.getByRole('link')).toHaveCount(0)
    await expect(list.getByRole('button')).toHaveCount(0)
  })
})

/** Each card's box, in document order. */
async function cardBoxes(page: Page) {
  return await cards(page).evaluateAll((items) =>
    items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect()
      return { x, y, width, height }
    }),
  )
}
