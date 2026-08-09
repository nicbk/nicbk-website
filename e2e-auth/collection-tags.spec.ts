import type { Locator, Page } from '@playwright/test'
import { expect, test, toggleThemeTo } from '../e2e/fixtures'
import {
  closeArticleConnection,
  deleteArticlesOf,
  deleteTagsOf,
  insertArticle,
  insertTag,
  signedInUserId,
  statusOfArticle,
  tagArticleWith,
  tagsOf,
} from './support/articles'
import { cards, chipsOf, statusOf } from './support/collection'
import { signInAndLandOn } from './support/sign-in'

/**
 * Tagging and reading status against the real stack — and the site's **first
 * client-side writes**, which is what makes this tier the only one that can
 * check them end to end.
 *
 * The unit tests assert the menu reports the right thing, and the integration
 * suite asserts the mutators authorize and write the right thing. Neither can
 * see what happens *between* them: an optimistic write applied to a local store,
 * pushed to zero-cache, forwarded to `/api/zero/mutate`, committed, replicated
 * back, and re-rendered. Every assertion here that reads Postgres afterwards is
 * there for one reason — a tag on a card may be an optimistic write the server
 * refused, and only the database can tell the two apart.
 *
 * Runs after collection-cards.spec.ts alphabetically and well before
 * user-settings.spec.ts, which deletes the shared account on its way out.
 */

const TRACKER = '/lit-tracker'
const PAPER = 'Attention Is All You Need'
/** A second card, so "every card is the same height" has something to compare. */
const OTHER_PAPER = 'Layer Normalization'

/** More tags than fit across a card at any width this suite uses. */
const MANY_TAGS = [
  'attention',
  'transformers',
  'survey',
  'nlp',
  'seq2seq',
  'benchmark',
  'to-read-again',
  'foundational',
  'architecture',
  'normalization',
]

/** The one card's menu trigger, named after the article it belongs to. */
function menuTrigger(page: Page): Locator {
  return page.getByRole('button', { name: `Options for ${PAPER}` })
}

async function openMenu(page: Page): Promise<Locator> {
  await menuTrigger(page).click()
  const popup = page.getByRole('dialog')
  await expect(popup).toBeVisible()
  return popup
}

/**
 * The field that both filters the tag list and creates a tag.
 *
 * By role rather than by label alone: Playwright matches an accessible name by
 * substring, so `getByLabel('tags')` also resolves the "matching tags" list
 * beside it.
 */
function tagField(page: Page): Locator {
  return page.getByRole('dialog').getByRole('textbox', { name: 'tags' })
}

/**
 * Tabs forward until `target` has focus, or gives up loudly.
 *
 * Asserts that a control is *reachable* by keyboard without pinning which
 * keystroke reaches it — the popover's initial focus target belongs to Base UI,
 * and a test that hard-codes it fails on an upgrade that changed nothing this
 * feature cares about.
 */
async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let step = 0; step < 10; step += 1) {
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return
    }
    await page.keyboard.press('Tab')
  }
  await expect(target).toBeFocused()
}

/** The tag chips on the one card. */
function chips(page: Page): Locator {
  return chipsOf(cards(page).first())
}

/** That card's reading-status icon, whose name is what it means. */
function status(page: Page): Locator {
  return statusOf(cards(page).first())
}

/**
 * A signed-in page holding exactly one article and no tags.
 *
 * Both are cleared: a tag outlives the articles it was applied to, so clearing
 * the collection alone would leave the previous test's tags in the menu.
 */
async function oneArticle(page: Page): Promise<string> {
  const { userId } = await collectionOf(page, [PAPER])
  return userId
}

/** A signed-in page holding exactly these articles, and no tags. */
async function collectionOf(
  page: Page,
  titles: readonly string[],
): Promise<{ userId: string; ids: Record<string, string> }> {
  await signInAndLandOn(page, TRACKER)
  const userId = await signedInUserId(page)
  await deleteArticlesOf(userId)
  await deleteTagsOf(userId)

  const ids: Record<string, string> = {}
  for (const title of titles) {
    const { id } = await insertArticle(userId, {
      title,
      authors: [{ name: 'Ashish Vaswani' }],
      publicationYear: 2017,
      venue: 'Advances in Neural Information Processing Systems',
    })
    ids[title] = id
  }
  await expect(cards(page)).toHaveCount(titles.length)
  return { userId, ids }
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('tags and reading status', () => {
  test('creates a tag from the card menu and stores it against this account', async ({
    page,
  }) => {
    const userId = await oneArticle(page)

    await openMenu(page)
    await tagField(page).fill('transformers')
    await tagField(page).press('Enter')

    // On the card first — this is the optimistic half.
    await expect(chips(page).filter({ hasText: 'transformers' })).toHaveCount(1)

    // And in Postgres — the half that says the server agreed. Polled, because
    // the round trip is what is being waited for.
    await expect
      .poll(() => tagsOf(userId))
      .toEqual([{ name: 'transformers', applied: 1 }])
  })

  test('applies an existing tag rather than making a second of the same name', async ({
    page,
  }) => {
    // The whole reason there is no separate "manage tags" screen: the typed
    // name is how a tag is both created and reused.
    const userId = await oneArticle(page)
    await insertTag(userId, 'survey')

    await openMenu(page)
    // An existing name applies that tag rather than making a second of it.
    await tagField(page).fill('survey')
    await tagField(page).press('Enter')

    await expect(chips(page).filter({ hasText: 'survey' })).toHaveCount(1)
    await expect
      .poll(() => tagsOf(userId))
      .toEqual([{ name: 'survey', applied: 1 }])
  })

  test('applies and removes a tag from the menu’s checklist', async ({
    page,
  }) => {
    const userId = await oneArticle(page)
    await insertTag(userId, 'survey')

    const menu = await openMenu(page)
    const item = menu.getByRole('checkbox', { name: /survey/ })
    await item.click()
    await expect
      .poll(() => tagsOf(userId))
      .toEqual([{ name: 'survey', applied: 1 }])

    // The menu stays open across toggles, which is what lets several tags be
    // applied in one visit — so the same item is still there to click again.
    await expect(menu).toBeVisible()
    await item.click()

    await expect
      .poll(() => tagsOf(userId))
      .toEqual([{ name: 'survey', applied: 0 }])
    await expect(chips(page).filter({ hasText: 'survey' })).toHaveCount(0)
  })

  test('sets a reading status, replacing the previous one', async ({
    page,
  }) => {
    const userId = await oneArticle(page)
    await expect(status(page)).toHaveAccessibleName('status: pending')

    const menu = await openMenu(page)
    await menu.getByRole('button', { name: 'reading' }).click()
    await expect(status(page)).toHaveAccessibleName('status: reading')
    await expect.poll(() => statusOfArticle(userId, PAPER)).toBe('reading')

    // `exact`, because Playwright matches an accessible name by substring and
    // "read" is a prefix of "reading" — without it this resolves to two items.
    await menu.getByRole('button', { name: 'read', exact: true }).click()

    // One status, not two: mutual exclusivity is the column being
    // single-valued, and there is no second write clearing the old value.
    await expect(status(page)).toHaveAccessibleName('status: read')
    await expect(status(page)).toHaveCount(1)
    await expect.poll(() => statusOfArticle(userId, PAPER)).toBe('read')
  })

  test('shows a new tag in a second window with no reload', async ({
    page,
    browser,
  }) => {
    // A second **window**, not a second tab: Zero drops sync for a hidden
    // document, and a test written with a background tab fails for a reason
    // that has nothing to do with the feature.
    const userId = await oneArticle(page)

    const watcher = await browser.newContext({
      storageState: await page.context().storageState(),
    })
    const watching = await watcher.newPage()
    try {
      await watching.goto(TRACKER)
      await expect(cards(watching)).toHaveCount(1)

      await openMenu(page)
      await tagField(page).fill('live')
      await tagField(page).press('Enter')

      // Nothing reloads the second window. The tag arrives because the write
      // reached Postgres and replicated back out.
      await expect(chips(watching).filter({ hasText: 'live' })).toHaveCount(1)
      await expect
        .poll(() => tagsOf(userId))
        .toEqual([{ name: 'live', applied: 1 }])
    } finally {
      await watcher.close()
    }
  })

  test('shows a status change in a second window with no reload', async ({
    page,
    browser,
  }) => {
    await oneArticle(page)

    const watcher = await browser.newContext({
      storageState: await page.context().storageState(),
    })
    const watching = await watcher.newPage()
    try {
      await watching.goto(TRACKER)
      const watched = statusOf(cards(watching).first())
      await expect(watched).toHaveAccessibleName('status: pending')

      const menu = await openMenu(page)
      await menu.getByRole('button', { name: 'reading' }).click()

      await expect(watched).toHaveAccessibleName('status: reading')
    } finally {
      await watcher.close()
    }
  })

  test('is operable from the keyboard alone, and returns focus on Escape', async ({
    page,
  }) => {
    const userId = await oneArticle(page)
    await insertTag(userId, 'survey')

    const trigger = menuTrigger(page)
    await trigger.focus()
    await page.keyboard.press('Enter')
    const popup = page.getByRole('dialog')
    await expect(popup).toBeVisible()

    // Reachability rather than a specific tab ordinal: where a popover puts
    // focus on open is Base UI's business and may reasonably change, while
    // "every control in here can be reached by tabbing" is this feature's.
    await tabTo(page, popup.getByRole('button', { name: 'pending' }))
    // Within the group it is arrow keys, not Tab — that is what a `ToggleGroup`
    // buys over three loose buttons, and why the statuses are one.
    await page.keyboard.press('ArrowRight')
    await expect(popup.getByRole('button', { name: 'reading' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect.poll(() => statusOfArticle(userId, PAPER)).toBe('reading')

    // And the tag field is reachable too, so creating a tag never needs a
    // pointer either.
    await tabTo(page, tagField(page))
    await page.keyboard.type('keyboard-made')
    await page.keyboard.press('Enter')
    await expect
      .poll(() => tagsOf(userId).then((tags) => tags.map((tag) => tag.name)))
      .toContain('keyboard-made')

    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()
    // Back where it started, rather than at the top of the document — which
    // would mean tabbing through the whole grid again.
    await expect(trigger).toBeFocused()
  })

  test('reveals the full text of an elided line on hover', async ({ page }) => {
    // The card clamps every line so the grid stays uniform; this is what keeps
    // the cut-off remainder readable. jsdom has no layout and cannot judge it.
    await oneArticle(page)

    await cards(page).first().getByRole('heading').hover()

    await expect(page.getByText(PAPER, { exact: true })).toHaveCount(2)
  })

  test('keeps the status and the tag field in view while the tag list scrolls', async ({
    page,
  }) => {
    // The three problems that turned this control from a menu into a popover,
    // all of which only appear once a reader has a real number of tags: a menu
    // is one list and scrolls as one, so hunting for a tag scrolled the reading
    // status away, and the way to make a new tag sat past the end of the list.
    const userId = await oneArticle(page)
    for (const name of MANY_TAGS) {
      await insertTag(userId, name)
    }

    const popup = await openMenu(page)
    const status = popup.getByRole('button', { name: 'pending' })
    const list = popup.getByRole('list', { name: 'matching tags' })
    await expect(list.getByRole('checkbox')).toHaveCount(MANY_TAGS.length)

    // The popup scales in, so a box measured immediately is a frame of the
    // animation rather than a resting position — and comparing two frames of a
    // transition is how this test was flaky before.
    await page.waitForTimeout(300)

    const before = await status.boundingBox()
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })

    // The list really did scroll…
    expect(await list.evaluate((element) => element.scrollTop)).toBeGreaterThan(
      0,
    )
    // …and nothing else moved with it.
    expect(await status.boundingBox()).toEqual(before)
    await expect(status).toBeVisible()
    await expect(tagField(page)).toBeVisible()
    // The popup itself never scrolls — only the list inside it does.
    expect(
      await popup.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    ).toBe(0)
  })

  test('offers to create a tag without scrolling past the list to find it', async ({
    page,
  }) => {
    const userId = await oneArticle(page)
    for (const name of MANY_TAGS) {
      await insertTag(userId, name)
    }

    const popup = await openMenu(page)
    await tagField(page).fill('brand-new')

    // Typing a name nothing matches empties the list, so the create control is
    // in view by construction rather than by luck.
    const create = popup.getByRole('button', { name: /create/ })
    await expect(create).toBeVisible()
    await create.click()

    await expect
      .poll(() => tagsOf(userId).then((tags) => tags.map((tag) => tag.name)))
      .toContain('brand-new')
  })

  test('filters a long tag list down to what was typed', async ({ page }) => {
    const userId = await oneArticle(page)
    for (const name of MANY_TAGS) {
      await insertTag(userId, name)
    }

    const popup = await openMenu(page)
    const list = popup.getByRole('list', { name: 'matching tags' })
    await expect(list.getByRole('checkbox')).toHaveCount(MANY_TAGS.length)

    await tagField(page).fill('seq')

    // Substring, not prefix: `seq2seq` matches, and so would anything else
    // carrying those letters anywhere.
    await expect(list.getByRole('checkbox')).toHaveCount(1)
    await expect(list.getByRole('checkbox', { name: /seq2seq/ })).toBeVisible()
  })

  test('keeps every card the same size when one carries more tags than fit', async ({
    page,
  }) => {
    // The case that decided how the chip row overflows. Wrapping was the first
    // implementation, and `grid-auto-rows: 1fr` means the grid gives every row
    // the height of its tallest card — so one heavily tagged paper made every
    // card beside it taller, including the ones with no tags at all. The row
    // scrolls sideways instead, and this is the assertion that says so.
    const { userId, ids } = await collectionOf(page, [PAPER, OTHER_PAPER])
    const articleId = ids[PAPER]
    if (articleId === undefined) {
      throw new Error('the seeded article has no id')
    }
    await tagArticleWith(userId, articleId, MANY_TAGS)

    const tagged = cards(page).filter({ hasText: PAPER })
    await expect(chipsOf(tagged)).toHaveCount(MANY_TAGS.length)

    const measured = await page.evaluate(
      ([title]) => {
        const articles = [...document.querySelectorAll('article')]
        const heights = articles.map((card) =>
          Math.round(card.getBoundingClientRect().height),
        )
        const busy = articles.find((card) =>
          card.textContent?.includes(String(title)),
        )
        const row = busy?.querySelector('ul')
        return {
          distinctHeights: new Set(heights).size,
          rowScrollsSideways: (row?.scrollWidth ?? 0) > (row?.clientWidth ?? 0),
          // A visible scrollbar would take height from every card, including
          // the ones that never scroll.
          scrollbarThickness:
            (row?.offsetHeight ?? 0) - (row?.clientHeight ?? 0),
          cardScrollsAtAll:
            (busy?.scrollHeight ?? 0) > (busy?.clientHeight ?? 0) ||
            (busy?.scrollWidth ?? 0) > (busy?.clientWidth ?? 0),
          pageScrollsSideways:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        }
      },
      [PAPER],
    )

    expect(measured.distinctHeights).toBe(1)
    expect(measured.rowScrollsSideways).toBe(true)
    expect(measured.scrollbarThickness).toBe(0)
    // The title, authors, and menu stay put; only the chips move.
    expect(measured.cardScrollsAtAll).toBe(false)
    expect(measured.pageScrollsSideways).toBe(false)
  })

  test('lets the keyboard reach the tags past the right-hand edge', async ({
    page,
  }) => {
    // The cost of hiding the scrollbar: the row has to take focus itself, or
    // the overflowing tags are reachable by pointer and by screen reader but
    // not by keyboard (WCAG 2.1.1).
    const { userId, ids } = await collectionOf(page, [PAPER])
    const articleId = ids[PAPER]
    if (articleId === undefined) {
      throw new Error('the seeded article has no id')
    }
    await tagArticleWith(userId, articleId, MANY_TAGS)

    const row = cards(page).first().getByRole('list', { name: 'tags' })
    await expect(chips(page)).toHaveCount(MANY_TAGS.length)

    await row.focus()
    await expect(row).toBeFocused()
    // Arrow keys, not End: `End` scrolls a container to its bottom, and this
    // one only ever overflows sideways — pressing it moves nothing, which is
    // how the first version of this test failed against a row that scrolls
    // perfectly well.
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    await expect
      .poll(() => row.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0)
  })

  for (const width of [360, 900, 1440]) {
    test(`fits a ${width}px viewport with the menu open`, async ({ page }) => {
      const userId = await oneArticle(page)
      await insertTag(userId, 'a-tag-with-a-fairly-long-name')
      await page.setViewportSize({ width, height: 800 })

      await openMenu(page)

      // A popup that overflows its container at one width is exactly what a
      // single-size check misses — #7's grid floor was caught this way.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
    })
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`passes axe with the menu open in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      const userId = await oneArticle(page)
      await insertTag(userId, 'survey')
      await toggleThemeTo(page, theme)

      await openMenu(page)
      // The popup animates in; a scan taken mid-fade measures a blend that is
      // never a resting state.
      await page.waitForTimeout(300)

      await expectNoA11yViolations()
    })

    test(`passes axe with an overflowing tag row in ${theme}`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      // Seeded past the card's width on purpose: a scroll region only trips
      // axe's `scrollable-region-focusable` rule when it is actually
      // scrolling, so a single tag would let the regression through.
      const { userId, ids } = await collectionOf(page, [PAPER])
      const articleId = ids[PAPER]
      if (articleId === undefined) {
        throw new Error('the seeded article has no id')
      }
      await tagArticleWith(userId, articleId, MANY_TAGS)
      await toggleThemeTo(page, theme)
      await expect(chips(page)).toHaveCount(MANY_TAGS.length)

      await expectNoA11yViolations()
    })
  }
})
