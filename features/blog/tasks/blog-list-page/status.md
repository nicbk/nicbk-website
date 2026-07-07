# Status: Blog List Page

**State:** Implemented, in review (2026-07-07). All local gates green (Biome,
typecheck incl. `cmk`, 121 unit tests, 31 e2e against the production build,
coverage 55.93% ≥ the 52.38% main baseline).

- Branch: `blog/blog-list-page`.
- Sub-issue: [#25](https://github.com/nicbk/nicbk-website/issues/25)
  (parent [#23](https://github.com/nicbk/nicbk-website/issues/23)); self-assigned.
- PR / CI / review: _pending._

## What shipped

- **Frontmatter-only listing helper** (`blog/posts.ts`): `getAllPostFrontmatter()`
  returns `{ slug, frontmatter }` for every post via the existing
  `{ import: 'frontmatter' }` lazy glob — so the list carries metadata only and
  no post body is bundled (the load-bearing lazy/frontmatter split from task 1).
- **Pure listing transforms** (`-utils/post-listing.ts`): `sortByDateDesc` and
  `excludeDrafts`, unit-tested directly (order + draft removal).
- **Loader** (`-lib/load-listing.ts`): `loadPostListing()` reads all frontmatter,
  drops drafts **only when `import.meta.env.PROD`** (drafts stay previewable in
  `npm run dev`; the live list never shows them), and orders newest-first.
  Returns serializable data, so the list server-renders.
- **Route** `src/routes/(personal-site)/blog.index.tsx`: replaces the placeholder
  with the real list — a `loader` over `load-listing` and its own `head()`
  (document `<title>` + meta description).
- **Component** (`-components/blog-list-page/`): `<h1>` main heading (focus-handoff
  target), a plain-text empty state, and a CSS **subgrid** row layout so
  date / title / description columns line up down the page while each row stays a
  real `<li>`. Rows are date (`<time>`, ISO, muted) / title (`<Link>`, primary
  weight) / description (muted) + inline `<PostTags>` (the shared component,
  reused — no drift). Client-side **infinite scroll** via a small
  `useIncrementalReveal` hook (IntersectionObserver sentinel over the static
  list; the first batch is server-rendered).

## Decisions / deviations (worth a reviewer's eye)

- **Draft exclusion keys on `import.meta.env.PROD`**, not a runtime flag, so the
  dev server previews drafts while the production Nitro build omits them. The
  Vitest run (dev mode) therefore sees drafts, so draft-exclusion is proven by
  the `excludeDrafts` unit test plus the e2e run against the production build.
- **Subgrid** for column alignment (baseline across current browsers), chosen
  over `display: contents` on `<li>` (which has historically dropped list
  semantics) so rows keep their `listitem` role. Rows collapse to a single
  stacked column under 40rem.
- **The list `<ul>` carries `aria-label="Blog posts"`** — names the list for
  assistive tech and disambiguates it from the nested per-row tag lists.
- **Infinite scroll reveals in batches of 15**, sized so the current handful of
  posts all appear at once (no hidden rows); paging only engages past 15
  published posts.

## Not in this task

- Search and tag filtering / URL search-param state (task 3).
- The post page and the MDX pipeline (task 1, merged in #37).
- Sitemap/RSS/structured data (out of scope for the whole feature).

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `mdx-pipeline-and-post-page`.
- 2026-07-07 — Implemented on branch `blog/blog-list-page` (#25 self-assigned),
  on top of the merged task-1 pipeline. Unit tests (sort/filter helpers,
  load-listing order + frontmatter-only guard, component rows/empty state) and
  e2e (list smoke, row-click nav, draft-exclusion + all-rows-visible, metadata,
  both-theme axe) added and green; coverage 55.93% ≥ baseline. Awaiting
  PR + CI + review.
