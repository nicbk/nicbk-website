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
