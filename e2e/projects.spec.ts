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

  test('links the tracker entry to the tracker', async ({ page }) => {
    // This page shipped with the entry unlinked, because the Literature
    // Tracker had no route and no decided URL (features/projects-page/
    // research.md). It has both now, so the name is a link — and the only link
    // inside <main>, since the description stays plain text.
    //
    // The destination is asserted rather than followed: `/lit-tracker` is
    // behind the route guard, which reads the session from the database, and
    // this suite deliberately runs with a placeholder DATABASE_URL and no
    // Postgres. Following it is covered where a real one exists —
    // e2e-auth/lit-tracker.spec.ts.
    await page.goto('/projects')
    const link = page.getByRole('link', { name: TRACKER_NAME })
    await expect(page.locator('main a')).toHaveCount(1)
    await expect(link).toHaveAttribute('href', '/lit-tracker')
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
