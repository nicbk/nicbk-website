import { expect, test } from './fixtures'

test.describe('app shell', () => {
  test('skip link is the first focusable element and moves focus to main', async ({
    page,
  }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeInViewport()

    await page.keyboard.press('Enter')
    // Focus may land on the <main> landmark itself (native fragment focus,
    // pre-hydration) or on the page's main heading (the router handles the
    // hash navigation once hydrated, triggering the focus handoff). Both
    // put focus inside the main content, which is the decided skip-link
    // behavior (research/accessibility/keyboard-and-focus-management.md).
    await expect
      .poll(() =>
        page.evaluate(() => {
          const main = document.getElementById('main-content')
          return (
            main !== null &&
            (document.activeElement === main ||
              main.contains(document.activeElement))
          )
        }),
      )
      .toBe(true)
  })

  test('client-side navigation hands focus to the destination heading', async ({
    page,
  }) => {
    // networkidle + retry: a click before React hydrates falls back to a
    // full page load (no client-side navigation, so no focus handoff) —
    // the known TanStack Start + Playwright timing gap flagged in
    // research/testing-qa/e2e-testing.md.
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(async () => {
      await page.getByRole('link', { name: 'projects' }).click()
      await expect(page.getByRole('heading', { name: 'projects' })).toBeFocused(
        { timeout: 1_000 },
      )
    }).toPass()
    await expect(page).toHaveURL('/projects')
  })

  test('header stays visible when scrolling and stays a single row at all widths', async ({
    page,
  }) => {
    await page.goto('/')
    const header = page.locator('header')

    // Sticky: pinned to the viewport top even after scrolling.
    await expect(header).toHaveCSS('position', 'sticky')
    await page.evaluate(() => {
      document.body.style.minHeight = '300vh'
      window.scrollTo(0, 1000)
    })
    const box = await header.boundingBox()
    expect(box?.y).toBe(0)

    // Single row, no hamburger, at narrow and wide widths: all links
    // visible, and the header no taller than one text row.
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 720 })
      for (const name of ['Nicolás Kennedy', 'projects', 'blog', 'about']) {
        await expect(page.getByRole('link', { name })).toBeInViewport()
      }
      const headerBox = await header.boundingBox()
      expect(headerBox?.height).toBeLessThan(80)
    }
  })

  test('shell passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/')
    await expectNoA11yViolations()
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expectNoA11yViolations()
  })

  test('header nav is keyboard operable with a visible focus indicator', async ({
    page,
  }) => {
    await page.goto('/')
    // Tab past the skip link onto the site name, then through the nav.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('link', { name: 'Nicolás Kennedy' }),
    ).toBeFocused()
    await page.keyboard.press('Tab')
    const projects = page.getByRole('link', { name: 'projects' })
    await expect(projects).toBeFocused()
    const outline = await projects.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    )
    expect(outline).not.toBe('none')
    // Enter activates the focused link (keyboard navigation works).
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/projects')
  })
})
