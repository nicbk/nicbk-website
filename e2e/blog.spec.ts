import { expect, test } from './fixtures'

const POST = {
  slug: 'building-this-site',
  title: 'Building this site with TanStack Start and MDX',
  description:
    'How this site renders Markdown-plus-JSX posts at build time, with type-safe frontmatter and no client-side syntax highlighter.',
  imageAlt: 'An MDX file compiling at build time into static HTML',
}

// The two published sample posts, newest-first by frontmatter date. The third
// sample post (notes-on-minimalism) is draft: true and must not appear in the
// production list.
const PUBLISHED_NEWEST_FIRST = [
  { slug: 'type-safe-frontmatter', title: 'Type-safe frontmatter with Zod' },
  {
    slug: 'building-this-site',
    title: 'Building this site with TanStack Start and MDX',
  },
]
const DRAFT_TITLE = 'Notes on a monospace, minimalist design'

test.describe('blog list page', () => {
  test('lists the published posts newest-first inside the shell', async ({
    page,
  }) => {
    await page.goto('/blog')
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: 'blog' }),
    ).toBeVisible()

    // Each row's title links to its post, in newest-first order.
    const titleLinks = page.getByRole('listitem').getByRole('link')
    await expect(titleLinks).toHaveText(
      PUBLISHED_NEWEST_FIRST.map((p) => p.title),
    )
    for (const post of PUBLISHED_NEWEST_FIRST) {
      await expect(
        page.getByRole('link', { name: post.title }),
      ).toHaveAttribute('href', `/blog/${post.slug}`)
    }
  })

  test('clicking a row navigates to that post', async ({ page }) => {
    await page.goto('/blog')
    const [first] = PUBLISHED_NEWEST_FIRST
    await page.getByRole('link', { name: first.title }).click()
    await expect(page).toHaveURL(`/blog/${first.slug}`)
    await expect(
      page.getByRole('heading', { level: 1, name: first.title }),
    ).toBeVisible()
  })

  test('excludes drafts and reveals every fitting row (no hidden rows)', async ({
    page,
  }) => {
    await page.goto('/blog')
    // The few sample posts all fit in the first reveal batch, so on the settled
    // DOM every published row is present and none are withheld by the infinite
    // scroll (its "all fit" branch); the draft post is absent entirely.
    const rows = page.getByRole('list', { name: 'Blog posts' }).locator('> li')
    await expect(rows).toHaveCount(PUBLISHED_NEWEST_FIRST.length)
    await expect(page.getByRole('link', { name: DRAFT_TITLE })).toHaveCount(0)
  })

  test('exposes the blog index document metadata', async ({ page }) => {
    await page.goto('/blog')
    await expect(page).toHaveTitle('Nicolás Kennedy')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'blog posts',
    )
  })

  test('passes axe (critical/serious) in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/blog')
    await expectNoA11yViolations()
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expectNoA11yViolations()
  })
})

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
