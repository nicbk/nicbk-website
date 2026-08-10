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
  tagsOf,
} from './support/articles'
import { cards, chipsOf } from './support/collection'
import { landOn } from './support/sign-in'

/**
 * The filter rail against the real stack.
 *
 * The predicate itself is unit-tested and needs no browser. What only a browser
 * can settle is everything around it: that a selection reaches the URL and comes
 * back out of it, that the back button steps through selections, that deleting a
 * tag really removes it from the cards carrying it, and — the claims jsdom
 * cannot make at all — that the rail moves out of the layout at a narrow width
 * and that the tag list is the only part of it that scrolls.
 *
 * Runs after collection-cards.spec.ts and before collection-tags.spec.ts
 * alphabetically, and well before user-settings.spec.ts, which deletes the
 * shared account on its way out.
 */

const TRACKER = '/lit-tracker'
const RAIL = { name: 'filter collection' }

/** Two papers, so a filter has something to keep and something to drop. */
const ATTENTION = 'Attention Is All You Need'
const RESNET = 'Deep Residual Learning for Image Recognition'

/**
 * More tags than fit in the rail at any height this suite runs at — the only
 * way to find out whether the reading statuses scroll away with them.
 */
const MANY_TAGS = [
  'agents',
  'alignment',
  'architecture',
  'benchmark',
  'diffusion',
  'distillation',
  'evaluation',
  'foundational',
  'interpretability',
  'long-context',
  'multimodal',
  'quantization',
  'reasoning',
  'retrieval',
  'robotics',
  'scaling-laws',
  'seq2seq',
  'survey',
  'tokenization',
]

function rail(page: Page): Locator {
  return page.getByRole('navigation', RAIL)
}

/** A filter toggle by its visible name, in whichever surface is showing. */
function tagToggle(page: Page, name: string): Locator {
  return page.getByRole('button', { name, exact: true })
}

/**
 * A reading-status toggle. `exact`, because Playwright matches an accessible
 * name by substring and "…marked read" is a prefix of "…marked reading".
 */
function statusToggle(page: Page, status: string): Locator {
  return page.getByRole('button', {
    name: `only articles marked ${status}`,
    exact: true,
  })
}

/**
 * A signed-in page holding two papers and a known set of tags.
 *
 * Both articles and tags are cleared first: a tag outlives the articles it was
 * applied to, so clearing the collection alone would leave a previous spec's
 * tags in this one's rail.
 */
async function seededCollection(page: Page): Promise<{
  userId: string
  attentionId: string
  resnetId: string
}> {
  await landOn(page, TRACKER)
  const userId = await signedInUserId(page)
  await deleteArticlesOf(userId)
  await deleteTagsOf(userId)

  const attention = await insertArticle(userId, {
    title: ATTENTION,
    authors: [{ name: 'Ashish Vaswani' }],
    publicationYear: 2017,
  })
  const resnet = await insertArticle(userId, {
    title: RESNET,
    authors: [{ name: 'Kaiming He' }],
    publicationYear: 2016,
  })

  // `transformers` is on both papers, `attention` on one — which is what makes
  // AND and OR give different answers, and so what makes the AND test mean
  // something.
  const transformers = await insertTag(userId, 'transformers')
  const attentionTag = await insertTag(userId, 'attention')
  await applyTagTo(attention.id, transformers.id)
  await applyTagTo(resnet.id, transformers.id)
  await applyTagTo(attention.id, attentionTag.id)

  await expect(cards(page)).toHaveCount(2)
  await expect(
    rail(page).getByRole('button', { name: 'transformers' }),
  ).toBeVisible()

  return { userId, attentionId: attention.id, resnetId: resnet.id }
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('collection filters', () => {
  test('narrows the collection, composing tags with AND', async ({ page }) => {
    await seededCollection(page)

    // One tag both papers carry: nothing is excluded yet.
    await tagToggle(page, 'transformers').click()
    await expect(cards(page)).toHaveCount(2)

    // A second tag only one of them carries. With OR this would still be two,
    // which is the whole reason this assertion exists.
    await tagToggle(page, 'attention').click()
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText(ATTENTION)
  })

  test('composes a reading status with the tag selection', async ({ page }) => {
    await seededCollection(page)

    await tagToggle(page, 'transformers').click()
    await expect(cards(page)).toHaveCount(2)

    // Both papers are `pending` — nothing has set a status — so filtering on
    // `read` empties the grid while the tag alone did not.
    await statusToggle(page, 'read').click()
    await expect(cards(page)).toHaveCount(0)

    await statusToggle(page, 'pending').click()
    await expect(cards(page)).toHaveCount(2)
  })

  test('keeps the narrowed view in the URL, through a reload and the back button', async ({
    page,
  }) => {
    await seededCollection(page)

    await tagToggle(page, 'attention').click()
    await expect(page).toHaveURL(/tags=/)
    await expect(cards(page)).toHaveCount(1)

    // Survives a reload, because the selection is in the URL rather than in
    // component state.
    await page.reload()
    await expect(cards(page)).toHaveCount(1)
    await expect(tagToggle(page, 'attention')).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // And the back button steps back through it: each toggle is a discrete
    // action, so each pushes a history entry.
    await page.goBack()
    await expect(cards(page)).toHaveCount(2)
    await expect(tagToggle(page, 'attention')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  test('leaves no trace in the URL once the last filter is dropped', async ({
    page,
  }) => {
    // So a plain link to the tracker stays plain, rather than carrying an empty
    // filter forever.
    await seededCollection(page)

    await tagToggle(page, 'attention').click()
    await tagToggle(page, 'attention').click()

    await expect(page).toHaveURL(TRACKER)
    await expect(cards(page)).toHaveCount(2)
  })

  test('says nothing matches, rather than that the collection is empty', async ({
    page,
  }) => {
    await seededCollection(page)

    await tagToggle(page, 'attention').click()
    await statusToggle(page, 'read').click()

    await expect(
      page.getByText('no articles match these filters.'),
    ).toBeVisible()
    await expect(page.getByText('no articles yet.')).toHaveCount(0)
    await expect(cards(page)).toHaveCount(0)
  })

  test('finds a tag by substring without disturbing the statuses', async ({
    page,
  }) => {
    const { userId } = await seededCollection(page)
    for (const name of MANY_TAGS) {
      await insertTag(userId, name)
    }
    await expect(
      rail(page).getByRole('button', { name: 'robotics' }),
    ).toBeVisible()

    await rail(page).getByRole('textbox', { name: 'find a tag' }).fill('form')

    await expect(tagToggle(page, 'transformers')).toBeVisible()
    await expect(tagToggle(page, 'robotics')).toHaveCount(0)
    // The statuses are a different group with a different rule, and finding a
    // tag has nothing to say about them.
    await expect(statusToggle(page, 'reading')).toBeVisible()
  })

  test('scrolls the tag list without scrolling the statuses away', async ({
    page,
  }) => {
    // The fault this rail inherited from the card menu's first draft, and the
    // reason both are built as three regions with one scroll container. Seeded
    // past the rail's height on purpose: a short list cannot show it.
    const { userId } = await seededCollection(page)
    for (const name of MANY_TAGS) {
      await insertTag(userId, name)
    }
    // Short enough that twenty-one tags cannot fit — the condition under test
    // does not exist on a tall window, and a viewport this suite happens to run
    // at is not something to leave the assertion resting on.
    await page.setViewportSize({ width: 1280, height: 560 })
    const list = rail(page).getByRole('list').last()
    await expect(
      rail(page).getByRole('button', { name: 'robotics' }),
    ).toBeAttached()

    const statusBefore = await statusToggle(page, 'pending').boundingBox()
    const findBefore = await rail(page)
      .getByRole('textbox', { name: 'find a tag' })
      .boundingBox()

    const scrolled = await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight
      return element.scrollTop
    })
    expect(scrolled).toBeGreaterThan(0)

    // The two fixed regions have not moved by a pixel.
    expect((await statusToggle(page, 'pending').boundingBox())?.y).toBe(
      statusBefore?.y,
    )
    expect(
      (
        await rail(page)
          .getByRole('textbox', { name: 'find a tag' })
          .boundingBox()
      )?.y,
    ).toBe(findBefore?.y)
  })

  test('asks before deleting a tag, and does nothing if dismissed', async ({
    page,
  }) => {
    const { userId } = await seededCollection(page)

    await rail(page).getByRole('button', { name: 'edit tags' }).click()
    await rail(page)
      .getByRole('button', { name: 'Delete tag attention' })
      .click()

    const confirmation = page.getByRole('alertdialog')
    await expect(confirmation).toBeVisible()
    // It says the size of what is about to be lost, not just its name.
    await expect(confirmation).toContainText('delete “attention”?')
    await expect(confirmation).toContainText('removed from 1 article')

    await confirmation.getByRole('button', { name: 'cancel' }).click()

    await expect(confirmation).toHaveCount(0)
    await expect(tagToggle(page, 'attention')).toBeVisible()
    // And in Postgres: a dismissed confirmation is not a slow delete.
    await expect
      .poll(() => tagsOf(userId))
      .toEqual([
        { name: 'attention', applied: 1 },
        { name: 'transformers', applied: 2 },
      ])
  })

  test('deletes a tag from the rail and from every card carrying it', async ({
    page,
  }) => {
    const { userId } = await seededCollection(page)
    const attentionCard = cards(page).filter({ hasText: ATTENTION })
    // The card's chips, not any text on it: the paper is *called* "Attention Is
    // All You Need", so a plain text match finds the title too.
    const chips = chipsOf(attentionCard)
    await expect(chips.filter({ hasText: 'attention' })).toHaveCount(1)

    await rail(page).getByRole('button', { name: 'edit tags' }).click()
    await rail(page)
      .getByRole('button', { name: 'Delete tag attention' })
      .click()
    await page.getByRole('button', { name: 'delete tag' }).click()

    // Gone from the rail and off the card, live and with no reload — the
    // `article_tags` row goes by ON DELETE CASCADE rather than a second write.
    await expect(tagToggle(page, 'attention')).toHaveCount(0)
    await expect(chips.filter({ hasText: 'attention' })).toHaveCount(0)
    // And the tag the card kept is untouched.
    await expect(chips.filter({ hasText: 'transformers' })).toHaveCount(1)

    await expect
      .poll(() => tagsOf(userId))
      .toEqual([{ name: 'transformers', applied: 2 }])
  })

  test('drops a deleted tag from the active filter, leaving no dead end', async ({
    page,
  }) => {
    // Otherwise its name stays in the URL, still narrowing the collection —
    // usually to nothing — with no toggle left in the rail to switch it off.
    await seededCollection(page)

    await tagToggle(page, 'attention').click()
    await expect(cards(page)).toHaveCount(1)

    await rail(page).getByRole('button', { name: 'edit tags' }).click()
    await rail(page)
      .getByRole('button', { name: 'Delete tag attention' })
      .click()
    await page.getByRole('button', { name: 'delete tag' }).click()

    await expect(page).toHaveURL(TRACKER)
    await expect(cards(page)).toHaveCount(2)
  })

  test('moves the filters into a drawer on a narrow screen', async ({
    page,
  }) => {
    await seededCollection(page)

    await page.setViewportSize({ width: 390, height: 844 })

    // The rail is out of the layout entirely — not merely hidden from view, or
    // a screen-reader user would meet two copies of the same filters.
    await expect(rail(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'filters' }).click()
    const sheet = page.getByRole('dialog', { name: 'filters' })
    await expect(sheet).toBeVisible()

    // And they filter from in there.
    await sheet.getByRole('button', { name: 'attention', exact: true }).click()
    await expect(page).toHaveURL(/tags=/)

    // Asserted after dismissing, not through the sheet: it is a modal, so while
    // it is open the collection behind it is inert and out of the accessibility
    // tree — which is correct, and means a role query cannot see it.
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(cards(page)).toHaveCount(1)
  })

  test('closes the drawer when the window grows past the breakpoint', async ({
    page,
  }) => {
    // Hiding the trigger in CSS stops a wide window opening the sheet but does
    // nothing about one already open: widening showed the rail and the sheet at
    // once, two copies of the same filters.
    await seededCollection(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'filters' }).click()
    await expect(page.getByRole('dialog', { name: 'filters' })).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 900 })

    await expect(page.getByRole('dialog', { name: 'filters' })).toHaveCount(0)
    await expect(rail(page)).toBeVisible()
  })

  for (const width of [390, 820, 1280]) {
    test(`overflows nowhere at ${width}px`, async ({ page }) => {
      const { userId } = await seededCollection(page)
      for (const name of MANY_TAGS) {
        await insertTag(userId, name)
      }
      await page.setViewportSize({ width, height: 844 })
      await expect(cards(page).first()).toBeVisible()

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
    })
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`passes axe with a full rail in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      // Seeded past the rail's height on purpose: a scroll region only trips
      // axe's `scrollable-region-focusable` rule when it is actually
      // scrolling, so a handful of tags would let the regression through.
      const { userId } = await seededCollection(page)
      for (const name of MANY_TAGS) {
        await insertTag(userId, name)
      }
      await toggleThemeTo(page, theme)
      await expect(
        rail(page).getByRole('button', { name: 'robotics' }),
      ).toBeVisible()

      await expectNoA11yViolations()
    })

    test(`passes axe with the filter drawer open in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      const { userId } = await seededCollection(page)
      for (const name of MANY_TAGS) {
        await insertTag(userId, name)
      }
      await page.setViewportSize({ width: 390, height: 844 })
      await toggleThemeTo(page, theme)

      await page.getByRole('button', { name: 'filters' }).click()
      // The sheet slides in; a scan taken mid-animation measures a position it
      // never rests at.
      await page.waitForTimeout(400)

      await expectNoA11yViolations()
    })

    test(`passes axe with the delete confirmation open in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      await seededCollection(page)
      await toggleThemeTo(page, theme)

      await rail(page).getByRole('button', { name: 'edit tags' }).click()
      await rail(page)
        .getByRole('button', { name: 'Delete tag attention' })
        .click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
      await page.waitForTimeout(300)

      await expectNoA11yViolations()
    })
  }
})
