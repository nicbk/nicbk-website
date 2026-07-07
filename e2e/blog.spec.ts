import { expect, test } from './fixtures'

const POST = {
  slug: 'building-this-site',
  title: 'Building this site with TanStack Start and MDX',
  description:
    'How this site renders Markdown-plus-JSX posts at build time, with type-safe frontmatter and no client-side syntax highlighter.',
  imageAlt: 'An MDX file compiling at build time into static HTML',
}

test.describe('blog post page', () => {
  test('renders the post inside the shell with its MDX content', async ({
    page,
  }) => {
    await page.goto(`/blog/${POST.slug}`)
    // The site header (banner landmark) — distinct from the post's own
    // <header> block, which is not a landmark inside <article>.
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: POST.title }),
    ).toBeVisible()

    // Build-time-highlighted code: the figure wrapper rehype-pretty-code emits
    // and the code text itself.
    await expect(
      page.locator('figure[data-rehype-pretty-code-figure]').first(),
    ).toBeVisible()
    await expect(page.locator('pre code').first()).toContainText('greet')

    // The global <Callout> and the co-located image both rendered.
    await expect(page.getByText('Note', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: POST.imageAlt })).toBeVisible()
  })

  test('the "back to blog list" link returns to /blog', async ({ page }) => {
    await page.goto(`/blog/${POST.slug}`)
    await page.getByRole('link', { name: /back to blog list/ }).click()
    await expect(page).toHaveURL('/blog')
  })

  test('exposes the post title and description as document metadata', async ({
    page,
  }) => {
    await page.goto(`/blog/${POST.slug}`)
    await expect(page).toHaveTitle(POST.title)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      POST.description,
    )
  })

  test('an unknown slug returns a real HTTP 404 and the not-found page', async ({
    page,
    request,
  }) => {
    const response = await request.get('/blog/does-not-exist')
    expect(response.status()).toBe(404)

    await page.goto('/blog/does-not-exist')
    await expect(
      page.getByRole('heading', { name: 'page not found' }),
    ).toBeVisible()
  })

  test('passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto(`/blog/${POST.slug}`)
    await expectNoA11yViolations()
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expectNoA11yViolations()
  })
})
