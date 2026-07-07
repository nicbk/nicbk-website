# Status: Blog

**Feature state:** In progress (2026-07-07). Task 1
(`mdx-pipeline-and-post-page`) is implemented and in review; tasks 2–3 not yet
started. Depends on
[`app-shell-and-home`](../app-shell-and-home/status.md) (Complete) — reuses its
`(personal-site)` shell/header, design tokens, and theming, and fills the
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
| `mdx-pipeline-and-post-page` | Implemented, in review ([#24](https://github.com/nicbk/nicbk-website/issues/24)) | [#37](https://github.com/nicbk/nicbk-website/pull/37) | pending | pending |
| `blog-list-page` | Not started ([#25](https://github.com/nicbk/nicbk-website/issues/25)) | — | — | — |
| `blog-search-and-filter` | Not started ([#26](https://github.com/nicbk/nicbk-website/issues/26)) | — | — | — |

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
