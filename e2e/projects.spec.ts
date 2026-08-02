import { expect, test, toggleThemeTo } from './fixtures'

const TRACKER_NAME = 'Academic Literature Tracker'
const TRACKER_DESCRIPTION =
  'upload papers, read and annotate them, and track reading progress'

test.describe('projects page', () => {
  test('renders inside the shell with the tracker entry', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('header')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'projects' })).toBeVisible()

    const entry = page.getByRole('listitem')
    await expect(entry).toHaveCount(1)
    await expect(entry).toContainText(TRACKER_NAME)
    await expect(entry).toContainText(TRACKER_DESCRIPTION)
  })

  test('offers no link, since the tracker does not exist yet', async ({
    page,
  }) => {
    // The Literature Tracker has no route and no decided URL (see
    // features/projects-page/research.md), so the page must not promise a
    // destination: nothing inside <main> links anywhere. The header's nav
    // links sit outside <main> and are unaffected.
    await page.goto('/projects')
    await expect(page.locator('main a')).toHaveCount(0)
  })

  test('does not overflow horizontally at a narrow viewport', async ({
    page,
  }) => {
    // The entry is a name and a description in one inline flow; on a phone it
    // must wrap rather than push the page sideways.
    await page.setViewportSize({ width: 360, height: 760 })
    await page.goto('/projects')

    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/projects')
    await expectNoA11yViolations()
    await toggleThemeTo(page, 'dark')
    await expectNoA11yViolations()
  })
})
