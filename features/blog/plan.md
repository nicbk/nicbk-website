# Plan: Blog

## Approach

Stand up the content pipeline and prove it end-to-end on a single rendered
**post** first; then build the **list** that links to posts; then layer
**search/filter** on top of the list. Each stage is independently
demoable/testable and merges behind its own PR + CI + human review before the
next begins.

The post page comes before the list for the same reason `about-page` published
the key artifacts before the page that consumes them: the list is a directory
*of* posts, so a post must first render honestly (real MDX, real frontmatter,
real slug routing) before a list of posts is meaningful. Building the post
route first also forces the pipeline (`import.meta.glob` discovery, the Zod
frontmatter schema, build-time highlighting, the MDX component provider) to
exist and be verifiable on one post before the list depends on it.

## Task breakdown and sequence

Tasks are sequential — one open at a time, each gated by its own PR + CI +
human review.

1. **[`mdx-pipeline-and-post-page`](./tasks/mdx-pipeline-and-post-page/description.md)**
   — The pipeline plus one working post. Add the MDX Vite integration
   (`@mdx-js/rollup` + `remark-frontmatter` + `remark-mdx-frontmatter` +
   `rehype-pretty-code` + `remark-lint-no-empty-image-alt-text`), the
   `blog/frontmatter-schema.ts` Zod schema (single source of the frontmatter
   type), the lazy `import.meta.glob` post-discovery data layer, the global
   `<Callout>` and `img` MDX overrides, and the `/blog/$slug` route (first
   `loader` + first per-page `head()`). Commit the 2–3 sample posts. Add the
   root `LICENSE` CC BY 4.0 carve-out for `blog/`. Exit state: visiting a
   sample post's URL renders it fully (prose width, highlighted code, callout,
   image with alt text) in both themes, with correct `<title>`/meta — no list
   page yet.

2. **[`blog-list-page`](./tasks/blog-list-page/description.md)**
   — Replace the `/blog` placeholder with the real reverse-chronological list:
   a CSS grid of aligned rows (date / title / one-line description / inline
   tags), consuming **frontmatter only** (no eager post-body bundling), with
   draft exclusion in production, infinite scroll, a plain-text empty state,
   and the page's own `head()`. Each row links to its post. Exit state:
   `/blog` lists all non-draft posts newest-first, matching the mockup, in
   both themes.

3. **[`blog-search-and-filter`](./tasks/blog-search-and-filter/description.md)**
   — Add the live search bar and the sidebar of toggleable tag filters over
   the list, with the query (search text + selected tags) held in
   TanStack Router **search params** (Zod-validated `validateSearch`, read via
   `useSearch`), so a filtered view is linkable and survives refresh/back.
   Responsive per the design-system conventions (sidebar reflows below content
   under the mobile breakpoint). Exit state: typing filters the list live and
   toggling tags narrows it, both reflected in the URL — establishing the
   reusable search/tag-sidebar style.

## Sequencing rationale

- **Pipeline + post first** so every later task builds on a proven content
  pipeline and a real, routable post rather than a mock — the pipeline is the
  riskiest, most cross-cutting part (Vite plugin ordering, SSR + glob,
  build-time highlighting) and is worth isolating and verifying on one post.
- **List before search/filter** because search/filter is a pure enhancement of
  a list that must already work; splitting them keeps the interactive URL-state
  + sidebar component (the largest single UI piece, and the one Lit Tracker
  inherits) in its own reviewable task rather than bundled with the grid.
- **No data layer at any stage** — content is static MDX resolved at
  build/SSR time, so "infinite scroll" is progressive rendering of an
  already-available metadata list, not server pagination.
