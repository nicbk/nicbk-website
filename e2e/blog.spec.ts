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

  test('stays within the viewport and caps the description measure across widths', async ({
    page,
  }) => {
    await page.goto('/blog')
    // No horizontal page overflow at narrow, mid, or wide viewports (the mid
    // band is where the fixed date/title columns used to starve the description
    // into an overflowing sliver).
    for (const width of [1600, 800, 400]) {
      await page.setViewportSize({ width, height: 800 })
      const overflows = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      )
      expect(overflows, `horizontal overflow at ${width}px`).toBe(false)
    }
    // At every width where the three-column row applies (>64rem), the description
    // must sit between a healthy floor and its ~60ch cap. The upper bound keeps it
    // from stretching the full width into an unwieldy measure; the lower bound is
    // the regression guard for the bug that prompted stacking the tags ABOVE the
    // list rather than in a right-hand `max-content` column — that side column
    // starved this one into a per-word-wrapping sliver on wide viewports WITHOUT
    // ever overflowing, so the horizontal-overflow check above cannot catch it.
    for (const width of [1600, 1200, 1100]) {
      await page.setViewportSize({ width, height: 800 })
      const descriptionWidth = await page
        .getByText('One schema is both', { exact: false })
        .evaluate((el) => el.clientWidth)
      expect(
        descriptionWidth,
        `description crushed at ${width}px`,
      ).toBeGreaterThan(350)
      expect(
        descriptionWidth,
        `description uncapped at ${width}px`,
      ).toBeLessThan(700)
    }
  })
})

test.describe('blog search and tag filter', () => {
  const TYPESAFE = 'Type-safe frontmatter with Zod' // tags: mdx, typescript, zod
  const BUILDING = 'Building this site with TanStack Start and MDX' // tags: meta, tanstack, mdx

  const postRows = (page: import('@playwright/test').Page) =>
    page.getByRole('list', { name: 'Blog posts' }).locator('> li')

  test('typing in the search bar narrows the list and updates the URL', async ({
    page,
  }) => {
    await page.goto('/blog')
    await expect(postRows(page)).toHaveCount(2)

    await page.getByRole('searchbox', { name: 'Search posts' }).fill('zod')

    // Settled URL carries the query (debounced), and the list narrows to the
    // single matching post.
    await expect(page).toHaveURL(/[?&]q=zod\b/)
    await expect(postRows(page)).toHaveCount(1)
    await expect(page.getByRole('link', { name: TYPESAFE })).toBeVisible()
    await expect(page.getByRole('link', { name: BUILDING })).toHaveCount(0)
  })

  test('toggling a tag narrows the list and updates the URL', async ({
    page,
  }) => {
    await page.goto('/blog')

    const typescriptTag = page.getByRole('button', { name: 'typescript' })
    await expect(typescriptTag).toHaveAttribute('aria-pressed', 'false')
    await typescriptTag.click()

    await expect(page).toHaveURL(/tags=.*typescript/)
    await expect(typescriptTag).toHaveAttribute('aria-pressed', 'true')
    await expect(postRows(page)).toHaveCount(1)
    await expect(page.getByRole('link', { name: TYPESAFE })).toBeVisible()
    await expect(page.getByRole('link', { name: BUILDING })).toHaveCount(0)
  })

  test('keeps focus in the search box while filtering (no handoff on filter)', async ({
    page,
  }) => {
    // Regression guard: the blog's filters live in the URL, and the route-change
    // focus handoff (src/focus-handoff.ts) used to fire on that same-page URL
    // update, yanking focus to the <h1> — so the reader had to click back into
    // the field after every settle. Filtering must leave focus on the input.
    await page.goto('/blog')
    const search = page.getByRole('searchbox', { name: 'Search posts' })
    await search.fill('zod')

    // Wait for the (debounced) URL mirror to land — i.e. the navigation that
    // used to steal focus has actually happened by now.
    await expect(page).toHaveURL(/[?&]q=zod\b/)
    await expect(postRows(page)).toHaveCount(1)
    await expect(search).toBeFocused()
  })

  test('keeps focus on a tag toggle after selecting it (no handoff on filter)', async ({
    page,
  }) => {
    // Same regression as above, for the tag toggles: clicking one navigates
    // (same pathname), which must not hand focus off to the heading.
    await page.goto('/blog')
    const typescriptTag = page.getByRole('button', { name: 'typescript' })
    await typescriptTag.click()

    await expect(page).toHaveURL(/tags=.*typescript/)
    await expect(typescriptTag).toBeFocused()
  })

  test('combines search and tags with AND', async ({ page }) => {
    // "mdx" (a tag on both posts) matches both; adding the "meta" tag (only on
    // Building this site) narrows the AND-composed result to that one post.
    await page.goto('/blog')
    await page.getByRole('searchbox', { name: 'Search posts' }).fill('mdx')
    await expect(postRows(page)).toHaveCount(2)

    await page.getByRole('button', { name: 'meta' }).click()
    await expect(postRows(page)).toHaveCount(1)
    await expect(page.getByRole('link', { name: BUILDING })).toBeVisible()
    await expect(page.getByRole('link', { name: TYPESAFE })).toHaveCount(0)
  })

  test('a pre-filtered URL reproduces the view and survives reload', async ({
    page,
  }) => {
    await page.goto('/blog?q=zod')
    await expect(
      page.getByRole('searchbox', { name: 'Search posts' }),
    ).toHaveValue('zod')
    await expect(postRows(page)).toHaveCount(1)
    await expect(page.getByRole('link', { name: TYPESAFE })).toBeVisible()

    await page.reload()
    await expect(
      page.getByRole('searchbox', { name: 'Search posts' }),
    ).toHaveValue('zod')
    await expect(postRows(page)).toHaveCount(1)
  })

  test('shows the plain-text no-match state when nothing matches', async ({
    page,
  }) => {
    await page.goto('/blog')
    await page
      .getByRole('searchbox', { name: 'Search posts' })
      .fill('kubernetes')

    await expect(page.getByText('No posts match your search.')).toBeVisible()
    await expect(postRows(page)).toHaveCount(0)
    // The controls stay so the reader can adjust or clear the filter.
    await expect(
      page.getByRole('searchbox', { name: 'Search posts' }),
    ).toBeVisible()
  })

  test('tag toggles push history; live typing does not flood it', async ({
    page,
  }) => {
    await page.goto('/blog')

    // A tag toggle is its own history entry, so back returns to the unfiltered
    // list.
    await page.getByRole('button', { name: 'typescript' }).click()
    await expect(page).toHaveURL(/typescript/)
    await page.goBack()
    await expect(page).not.toHaveURL(/typescript/)
    await expect(postRows(page)).toHaveCount(2)

    // Typing uses replace navigation, so per-keystroke changes don't grow the
    // history stack (the final state is still reachable in the URL).
    const lengthBefore = await page.evaluate(() => window.history.length)
    await page
      .getByRole('searchbox', { name: 'Search posts' })
      .pressSequentially('zod', { delay: 40 })
    await expect(page).toHaveURL(/[?&]q=zod\b/)
    const lengthAfter = await page.evaluate(() => window.history.length)
    expect(lengthAfter).toBe(lengthBefore)
  })

  test('the tag filter remains operable at a mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await page.goto('/blog')

    const tagFilter = page.getByRole('navigation', { name: 'Filter by tag' })
    await expect(tagFilter).toBeVisible()

    // No horizontal page overflow with the search + filter UI present at narrow.
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)

    // The toggle still filters at this width.
    await page.getByRole('button', { name: 'typescript' }).click()
    await expect(page).toHaveURL(/tags=.*typescript/)
    await expect(postRows(page)).toHaveCount(1)
  })

  test('passes axe (critical/serious) with a tag selected, in both themes', async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto('/blog')
    await page.getByRole('button', { name: 'typescript' }).click()
    await expect(page).toHaveURL(/typescript/)

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

  test('the post image stays within the column at a narrow viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await page.goto(`/blog/${POST.slug}`)
    // No horizontal page scroll: the co-located SVG (intrinsically wider than a
    // phone viewport) must scale down, not overflow. Regression guard for the
    // MDX `<img>` that bypassed the BlogImage max-width override.
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
    const imageFitsColumn = await page
      .getByRole('img', { name: POST.imageAlt })
      .evaluate((el) => {
        const image = el as HTMLImageElement
        const parent = image.parentElement
        return parent !== null && image.clientWidth <= parent.clientWidth
      })
    expect(imageFitsColumn).toBe(true)
  })
})
