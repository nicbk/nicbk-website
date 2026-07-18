# Status: Blog

**Feature state:** **Complete** (2026-07-18; all three tasks merged). Task 1
(`mdx-pipeline-and-post-page`, #37), task 2 (`blog-list-page`, #39), and task 3
(`blog-search-and-filter`, #46) are each merged behind their own passing CI +
human review. Depends on
[`app-shell-and-home`](../app-shell-and-home/status.md) (Complete) — reuses its
`(personal-site)` shell/header, design tokens, and theming, and filled the
`/blog` placeholder route it left in place.

Feature parent issue:
[#23](https://github.com/nicbk/nicbk-website/issues/23); task sub-issues
[#24](https://github.com/nicbk/nicbk-website/issues/24)
(`mdx-pipeline-and-post-page`),
[#25](https://github.com/nicbk/nicbk-website/issues/25) (`blog-list-page`), and
[#26](https://github.com/nicbk/nicbk-website/issues/26)
(`blog-search-and-filter`), linked as native sub-issues of #23.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `mdx-pipeline-and-post-page` | Merged ([#24](https://github.com/nicbk/nicbk-website/issues/24)) | [#37](https://github.com/nicbk/nicbk-website/pull/37) | green | merged |
| `blog-list-page` | Merged ([#25](https://github.com/nicbk/nicbk-website/issues/25)) | [#39](https://github.com/nicbk/nicbk-website/pull/39) | green | merged |
| `blog-search-and-filter` | Merged ([#26](https://github.com/nicbk/nicbk-website/issues/26)) | [#46](https://github.com/nicbk/nicbk-website/pull/46) | green | merged |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met and each task
merged behind its own passing CI + human review. In short: MDX posts
(`blog/posts/<slug>/index.mdx`) render at `/blog/<slug>` with build-time
frontmatter/alt-text validation, Shiki-highlighted code styled from site
tokens, a max-width prose column, and per-page title/meta/OG; `/blog` lists
them reverse-chronologically (grid rows, inline tags, draft-excluded, infinite
scroll); and a search bar + tag-filter sidebar filter the list via URL search
params — all WCAG 2.2 AA in both themes, with the search/tag-sidebar style
established here for the Lit Tracker to reuse.

## Notes carried into implementation

- **Lazy `import.meta.glob`, not eager** — the list must bundle frontmatter
  only; an eager glob silently bundles every post's body into the list page
  (the flagged Vite+MDX mistake). See
  [research.md](./research.md).
- **Verify the unknown-slug path returns a real HTTP 404** (not a 200 with an
  empty post) against TanStack Start's actual behavior, as with
  `error-and-not-found`.
- **Zod 4, no `@tanstack/zod-adapter`** for `validateSearch` (the adapter pins
  Zod 3) — pass the schema directly.
- **Prose max-width and syntax-highlight colors are new tokens** derived from
  the existing palette — not per-component literals, not a third-party syntax
  theme.
- **Seed content:** the implementation session authors 2–3 real sample posts
  (code block + `<Callout>` + co-located image + varied tags/dates, incl. one
  `draft: true`) so the list/search/filter/highlighting tests have real
  content.

## Log

- 2026-07-06 — Feature spec'd on merit as the highest-value remaining Phase-1
  slice: self-contained (no forward dead-references), correct dependency order
  (originates the MDX pipeline and the shared search/tag-sidebar style the Lit
  Tracker later reuses). Three tasks defined:
  `mdx-pipeline-and-post-page` → `blog-list-page` → `blog-search-and-filter`.
  Scoping confirmed with the user: impl session writes sample posts; meta + OG
  only (sitemap/RSS deferred); three tasks. Awaiting implementation start.
- 2026-07-06 — GitHub issues filed: parent #23, sub-issues #24/#25/#26 linked
  under it. All sub-issues unassigned; implementation left to another session.
- 2026-07-07 — Task 1 (`mdx-pipeline-and-post-page`) implemented on branch
  `blog/mdx-pipeline-and-post-page` (#24 self-assigned): the MDX pipeline
  (frontmatter/alt-text/Shiki), the `blog/` content root + Zod schema + lazy
  `import.meta.glob` data layer, and the `/blog/$slug` post route (first
  `loader` + `head()`) with three sample posts. Also added the root `LICENSE`
  (Apache-2.0 + `blog/` CC BY 4.0 carve-out), closing a pre-existing gap.
  Details, including the alt-text and syntax-color deviations, in the
  [task status](./tasks/mdx-pipeline-and-post-page/status.md). Awaiting
  PR + CI + review.
- 2026-07-07 — Task 1 merged (PR #37). Task 2 (`blog-list-page`) implemented on
  branch `blog/blog-list-page` (#25 self-assigned): a frontmatter-only listing
  helper (`getAllPostFrontmatter`, reusing the lazy glob — no bodies bundled),
  pure sort/draft-filter utils, a `-lib/load-listing.ts` loader (drafts excluded
  only in the production build), and the real `/blog` route replacing the
  placeholder — a subgrid row layout (date / title link / description + inline
  tags) with client-side infinite scroll and a plain-text empty state. Details
  in the [task status](./tasks/blog-list-page/status.md). Awaiting PR + CI +
  review.
- 2026-07-17 — Task 2 merged (PR #39). Task 3 (`blog-search-and-filter`)
  implemented on branch `blog/blog-search-and-filter` (#26): URL-search-param
  filter state (Zod 4 `validateSearch`, no adapter), a debounced native search
  bar, a native-button tag filter (AND-composed multi-select), a pure
  `filterPosts` predicate, a layout stacking search → tags → list, and a
  distinct no-match state. Confirmed
  with the user: AND tag semantics, tags-above-list on mobile (not a drawer),
  native elements over Base UI. Details, incl. the `.optional()`-not-`.default()`
  schema decision, in the [task status](./tasks/blog-search-and-filter/status.md).
  Awaiting PR + CI + review — this completes the feature's tasks pending that
  merge.
- 2026-07-18 — Task 3 merged (PR #46). **Feature complete** — all three tasks
  merged; every acceptance criterion in
  [constraints-and-behavior.md](./constraints-and-behavior.md) is met (MDX
  pipeline + post page, reverse-chronological list, and URL-driven search + tag
  filtering, WCAG 2.2 AA in both themes). The search + tag-filter style is
  established here for the Lit Tracker collection view (Phase 3) to reuse.
- 2026-07-17 — Post-merge follow-up fix to the list layout: the wide-viewport
  right-hand tag column was crushing the post description into a per-word/
  per-character wrapping sliver, so the tags now stack above the list at every
  width (see the [task status](./tasks/blog-search-and-filter/status.md) log).
  Own branch + PR off `main`; feature remains Complete.
