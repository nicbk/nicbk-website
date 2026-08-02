import type { Page } from '@playwright/test'
import { expect, test, toggleThemeTo } from '../e2e/fixtures'
import {
  closeArticleConnection,
  deleteArticlesOf,
  insertArticle,
  signedInUserId,
} from './support/articles'
import { signInAndLandOn } from './support/sign-in'

/**
 * The Lit Tracker shell against the real stack: the route guard on a page a
 * visitor can actually reach, the app-shell layout, and — the point of the task
 * — data arriving on an open page because it appeared in Postgres, with nothing
 * asking for it.
 *
 * This is the first coverage anywhere in the project that exercises the whole
 * reactive path: Postgres → zero-cache → `/api/zero/query` (which decides whose
 * rows those are, from the forwarded session cookie) → WebSocket → the DOM.
 * Everything about it is asserted as resulting DOM state with retrying
 * matchers, never on the wire and never after a fixed sleep
 * (research/testing-qa/e2e-testing.md).
 *
 * Runs before user-settings.spec.ts alphabetically, which matters: that file
 * deletes the shared account on its way out.
 */

const TRACKER = '/lit-tracker'
const EMPTY_STATE = 'no articles yet.'

/**
 * The article rows, scoped to their own list.
 *
 * A bare `listitem` role would also match the header's path, which is a
 * one-item list of its own — so an unscoped count silently reads one too many,
 * or reads "1" on a page showing no articles at all.
 */
function articleEntries(page: Page) {
  return page.getByRole('list', { name: 'Articles' }).getByRole('listitem')
}

test.afterAll(async () => {
  await closeArticleConnection()
})

test.describe('lit-tracker shell', () => {
  test('sends a signed-out visitor to sign in, with no interstitial', async ({
    page,
  }) => {
    const responses: string[] = []
    page.on('response', (response) => {
      if (response.request().resourceType() === 'document') {
        responses.push(new URL(response.url()).pathname)
      }
    })

    await page.goto(TRACKER)

    await expect(page).toHaveURL(
      `/sign-in?returnTo=${encodeURIComponent(TRACKER)}`,
    )
    // No access-denied page in between (research/ui-ux/pages/index.md): the
    // only documents fetched are the tracker URL and the sign-in page it
    // redirects to.
    expect(responses).toEqual([TRACKER, '/sign-in'])
  })

  test('renders the tracker for a signed-in visitor returning from sign-in', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)

    await expect(
      page.getByRole('link', { name: 'Literature Tracker' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: 'collection' }),
    ).toBeVisible()
  })

  test('sends the header path to the personal site, and the app name to the tracker', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)

    // Two links, two destinations. `nicbk_home` is the root of the path — the
    // site the tracker is hosted on — and is literal for every account.
    const path = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(
      path.getByRole('link', { name: 'nicbk_home' }),
    ).toHaveAttribute('href', '/')
    await expect(
      page.getByRole('link', { name: 'Literature Tracker' }),
    ).toHaveAttribute('href', '/lit-tracker')

    // And it really leaves: following it lands on the personal site's home.
    await expect(async () => {
      await path.getByRole('link', { name: 'nicbk_home' }).click()
      await expect(page).toHaveURL('/', { timeout: 2_000 })
    }).toPass()
    await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible()
  })

  test('puts the account control in the sidebar and the theme toggle in the header', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)

    const header = page.getByRole('banner')
    const account = page.getByRole('button', { name: 'Account settings' })
    const toggle = page.getByRole('button', { name: 'Toggle theme' })

    // The account control belongs at the foot of the sidebar, per the sample
    // mockup — not in the header, and not inside the scrolling content.
    await expect(account).toBeVisible()
    await expect(
      header.getByRole('button', { name: 'Account settings' }),
    ).toHaveCount(0)
    await expect(
      page.locator('main').getByRole('button', { name: 'Account settings' }),
    ).toHaveCount(0)

    // The theme toggle is in the header at its far end, the same position it
    // holds on the site-wide header. Without it the tracker would be the one
    // place on the site with no way to change theme.
    await expect(
      header.getByRole('button', { name: 'Toggle theme' }),
    ).toHaveCount(1)

    // It sits below the content's top edge — i.e. it really is in the rail,
    // not floating in the header row.
    const accountBox = await account.boundingBox()
    const headerBox = await header.boundingBox()
    expect(accountBox?.y ?? 0).toBeGreaterThan(
      (headerBox?.y ?? 0) + (headerBox?.height ?? 0),
    )
    await expect(toggle).toBeVisible()
  })

  test('shows the empty state once the collection is known to be empty', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)
    await deleteArticlesOf(await signedInUserId(page))
    await page.reload()

    // Retrying matcher, not a sleep: the first sync has to complete before the
    // surface may say this at all, and until then it shows the placeholder.
    await expect(page.getByText(EMPTY_STATE)).toBeVisible()
  })

  test('a row inserted into Postgres appears without navigating or reloading', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)
    const userId = await signedInUserId(page)
    await deleteArticlesOf(userId)
    await page.reload()

    // Wait for the page to have settled into "empty" before writing anything,
    // so what follows cannot be satisfied by the initial load.
    await expect(page.getByText(EMPTY_STATE)).toBeVisible()
    const urlBefore = page.url()

    await insertArticle(userId, {
      title: 'Attention Is All You Need',
      authors: [
        { name: 'Ashish Vaswani' },
        { name: 'Noam Shazeer' },
        { name: 'Niki Parmar' },
      ],
    })

    const entry = articleEntries(page)
    await expect(entry).toContainText('Attention Is All You Need')
    // Three authors, so the collection's display rule collapses them.
    await expect(entry).toContainText('Ashish Vaswani et al.')
    await expect(page.getByText(EMPTY_STATE)).toHaveCount(0)

    // Nothing navigated: the row arrived over the sync connection, which is the
    // whole claim being made here.
    expect(page.url()).toBe(urlBefore)
  })

  test('keeps the header fixed while the collection panel scrolls', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)
    const userId = await signedInUserId(page)
    await deleteArticlesOf(userId)

    // Enough rows to overflow the panel — the layout difference from the
    // personal site's sticky header is only observable once there is something
    // to scroll.
    for (let index = 0; index < 40; index += 1) {
      await insertArticle(userId, { title: `Paper number ${index}` })
    }
    await page.reload()
    await expect(articleEntries(page)).toHaveCount(40)

    const header = page.getByRole('banner')
    const before = await header.boundingBox()

    const scrolled = await page.evaluate(() => {
      const panel = document.getElementById('main-content')
      if (!panel) {
        throw new Error('the content panel is missing')
      }
      panel.scrollTop = panel.scrollHeight
      return {
        panelScrollTop: panel.scrollTop,
        documentScrollTop: document.scrollingElement?.scrollTop ?? 0,
      }
    })

    // The panel moved…
    expect(scrolled.panelScrollTop).toBeGreaterThan(0)
    // …the document did not, because in an app shell it never scrolls at all…
    expect(scrolled.documentScrollTop).toBe(0)
    // …and the header stayed exactly where it was.
    expect(await header.boundingBox()).toEqual(before)
  })

  test('fits narrow, mid, and wide viewports without sideways scrolling', async ({
    page,
  }) => {
    await signInAndLandOn(page, TRACKER)
    const userId = await signedInUserId(page)
    await deleteArticlesOf(userId)
    // A title with no spaces to break at is the realistic worst case for a
    // list that must never widen its panel.
    await insertArticle(userId, {
      title:
        'Supercalifragilisticexpialidocious-Methodologies-For-Distributed-Consensus-10.1145/3292500.3330701',
      authors: [{ name: 'Ada Lovelace' }],
    })
    await page.reload()
    await expect(articleEntries(page)).toHaveCount(1)

    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 720 })
      const overflows = await page.evaluate(() => {
        const panel = document.getElementById('main-content')
        return {
          document: document.documentElement.scrollWidth > window.innerWidth,
          panel: panel ? panel.scrollWidth > panel.clientWidth : false,
        }
      })
      expect(overflows, `at ${width}px`).toEqual({
        document: false,
        panel: false,
      })
    }
  })

  test('reads correctly in both themes with no flash of the wrong one', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await signInAndLandOn(page, TRACKER)

    const header = page.getByRole('banner')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(header).toHaveCSS(
      'background-color',
      'rgb(245, 245, 245)', // --color-bg-surface, light
    )

    // The tracker carries its own copy of the site's theme toggle, in the
    // same far-right position — so this is the control a reader would actually
    // reach for, not a stand-in for one.
    await toggleThemeTo(page, 'dark')
    await expect(header).toHaveCSS(
      'background-color',
      'rgb(31, 31, 31)', // --color-bg-surface, dark
    )
  })

  test('passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await signInAndLandOn(page, TRACKER)
    const userId = await signedInUserId(page)
    await deleteArticlesOf(userId)
    await insertArticle(userId, {
      title: 'A Mathematical Theory of Communication',
      authors: [{ name: 'Claude Shannon' }],
    })
    await page.reload()

    // Scan the settled page, with a real row on it: the placeholder and the
    // list are different markup, and only one of them is what a reader spends
    // any time with.
    await expect(articleEntries(page)).toHaveCount(1)
    await expectNoA11yViolations()

    await toggleThemeTo(page, 'dark')
    await expect(articleEntries(page)).toHaveCount(1)
    await expectNoA11yViolations()
  })
})
