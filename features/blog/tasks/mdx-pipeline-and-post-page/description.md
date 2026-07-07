# Task: MDX Pipeline + Post Page

Stand up the MDX content pipeline and prove it end-to-end by rendering one real
post at `/blog/<slug>`, matching
[blog-post.md](../../../../research/ui-ux/pages/site-wide/pages/blog-post.md).
This is the walking skeleton the list and search/filter tasks build on.

## What this task does — concretely

- **MDX Vite integration.** Add `@mdx-js/rollup` to `vite.config.ts`, ordered
  correctly relative to `tanstackStart()` / `nitro()` / `viteReact()`, with the
  remark/rehype plugin chain:
  - `remark-frontmatter` + `remark-mdx-frontmatter` (frontmatter → a plain
    `export const frontmatter` per module),
  - `rehype-pretty-code` (build-time Shiki highlighting, unstyled),
  - `remark-lint-no-empty-image-alt-text` (build fails on missing alt text).
- **Frontmatter schema.** Add `blog/frontmatter-schema.ts`: a Zod schema
  (required `title`/`date`/`description`; optional `updated`/`tags`/`draft`
  default-false/`coverImage`) that is the single source of the frontmatter
  TypeScript type (`z.infer`), and a helper that parses a module's
  `frontmatter` export against it (throwing on invalid input at build/SSR
  time).
- **Post-discovery data layer.** Add a module (e.g. `blog/posts.ts`) that
  discovers posts via **lazy** `import.meta.glob('/blog/posts/*/index.mdx')`
  (dynamic-`import()` form) and exposes typed helpers — at minimum
  `getPostSlugs()` and `getPost(slug)` (loading the compiled MDX component +
  validated frontmatter for one post). The list task extends this with a
  frontmatter-only listing helper; this task only needs single-post loading.
- **MDX component provider.** Register a global `<Callout type="note" |
  "warning" | "tip">` component and a custom `img` override (co-located image
  handling + the alt-text contract), via MDX's `components` provider so posts
  need no per-file imports. Each is a colocated component with a CSS Module
  styled from tokens.
- **Post route.** Add `src/routes/(personal-site)/blog.$slug.tsx` (or the
  equivalent nested route) with:
  - a **`loader`** resolving the post for the slug (first `loader` in the app),
    triggering the not-found path for an unknown slug,
  - a per-page **`head()`** setting `<title>`, `meta name="description"` (from
    frontmatter), and basic Open Graph tags (using `coverImage` when present) —
    first per-page `head()` in the app,
  - a colocated `-components/blog-post-page/` component rendering the header
    block (title, date, `updated` when present, inline tags, "back to blog
    list" link) and the compiled MDX body inside a **max-width prose column**.
- **Design tokens.** Add a documented **prose content-width** token and a small
  set of **syntax-highlight color tokens derived from the existing `--color-*`
  palette** (themed light/dark), to the design-token stylesheets — code styling
  comes from these, never a third-party syntax theme.
- **Licensing.** Add the root `LICENSE` **CC BY 4.0 carve-out** for `blog/`
  content (distinct from the code's Apache-2.0).
- **Seed content.** Commit **2–3 real sample posts** under
  `blog/posts/<slug>/index.mdx` that exercise a fenced code block (highlighted),
  a `<Callout>`, a co-located image (with alt text), and varied `tags`/`date`
  (and at least one `draft: true` post for the list task to exclude later).

## Not in this task

- The `/blog` **list** page (task 2) — this task leaves the existing `/blog`
  placeholder untouched.
- **Search and tag filtering** (task 3).
- Sitemap/RSS/structured data (out of scope for the whole feature).
