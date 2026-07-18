import { expect, test } from './fixtures'

test.describe('about page', () => {
  test('renders inside the shell with both section labels', async ({
    page,
  }) => {
    await page.goto('/about')
    await expect(page.locator('header')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'about' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Communication' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Version Control' }),
    ).toBeVisible()
  })

  test("the page's two internal asset links actually resolve", async ({
    request,
  }) => {
    // Résumé PDF and armored public key, both served from public/ by the
    // gpg-key-publishing wiring. A 200 confirms the hrefs on the page point at
    // real served assets.
    const pdf = await request.get('/nicbk_cv.pdf')
    expect(pdf.status()).toBe(200)
    expect(pdf.headers()['content-type']).toContain('application/pdf')

    const asc = await request.get('/pgp/nicbk.asc')
    expect(asc.status()).toBe(200)
    expect(await asc.text()).toContain('-----BEGIN PGP PUBLIC KEY BLOCK-----')
  })

  test('does not overflow horizontally at a narrow viewport', async ({
    page,
  }) => {
    // The GPG fingerprint is a 40-char string with no break opportunities. In
    // the definition-list grid it once pinned the value column wider than a
    // narrow viewport and forced horizontal page scroll; the value column is now
    // minmax(0, 1fr) and .desc wraps unbreakable values. Guard both the overall
    // no-overflow invariant and that the fingerprint itself stays in view.
    //
    // 480px, not a phone-minimum width: this isolates the about-page content.
    // The shared site header has its own (narrower) overflow floor below ~400px,
    // covered by shell.spec.ts; testing the about content here above that floor
    // keeps this guard about the fingerprint/definition-list layout.
    await page.setViewportSize({ width: 480, height: 760 })
    await page.goto('/about')

    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(0)

    const fingerprint = page.getByText(/^[0-9A-F]{40}$/)
    await expect(fingerprint).toBeVisible()
    const withinViewport = await fingerprint.evaluate(
      (el) => el.getBoundingClientRect().right <= window.innerWidth,
    )
    expect(withinViewport).toBe(true)
  })

  test('passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/about')
    await expectNoA11yViolations()
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expectNoA11yViolations()
  })
})
