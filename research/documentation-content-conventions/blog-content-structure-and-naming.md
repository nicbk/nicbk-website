# Blog Content Structure & Naming

Researched: 2026-07-05. Decided: 2026-07-05.

Physical layout of blog post files under the blog subfolder (per
[DESIGN.md](../../high-level-guidance/design/DESIGN.md) — MDX files
committed directly into source), and the filename/slug convention.

## Decision

- **Folder-per-post:** `blog/posts/<slug>/index.mdx`, with any images the
  post uses co-located in the same folder (e.g.
  `blog/posts/<slug>/diagram.png`), imported into the MDX via normal Vite
  asset imports. A post and everything it needs travel together as one
  self-contained unit.
- **Slug = folder name, kebab-case, no date prefix** (e.g.
  `blog/posts/my-first-post/index.mdx`, not
  `blog/posts/2026-07-05-my-first-post/`). The publish date already lives in
  frontmatter (see
  [blog-frontmatter-schema.md](./blog-frontmatter-schema.md)) as the single
  source of truth for chronological ordering — a date prefix on the folder
  name would duplicate that same information in two places that could drift
  out of sync (e.g. an edited/republished post's frontmatter `date` no
  longer matching its original folder name).
- **Posts are discovered via `import.meta.glob`** (Vite's built-in bulk
  module import), scanning `blog/posts/*/index.mdx`, rather than a manually
  maintained list/registry of posts.
- **The blog list page must not eagerly bundle every post's full content.**
  `import.meta.glob` is used in its lazy form (dynamic `import()` per
  match, not eager static imports) so the list page's bundle only pulls in
  each post's frontmatter/metadata, and a post's full MDX body is only
  loaded when that post's own page is visited.

## Reasoning

- Folder-per-post's usual downside — it doesn't work in Next.js, since
  Next.js requires static assets to live under `/public` rather than
  alongside content files — doesn't apply here, since this project is on
  TanStack Start/Vite (see
  [../technologies/frontend-framework.md](../technologies/frontend-framework.md)),
  where Vite's asset-import pipeline handles co-located images natively.
  With that blocker removed, folder-per-post's benefit (a post is a
  self-contained, movable unit) is a clear win with no real cost for this
  stack.
- Kebab-case is the standard URL-slug convention (hyphens are recognized as
  word separators by search engines and are more legible than underscores),
  and decoupling the slug from any date encoding follows the same
  single-source-of-truth reasoning already applied to the frontmatter
  `slug`-field decision — the folder name only needs to be stable and
  unique, which it already is without a date prefix.
- Deferring to `import.meta.glob` rather than a hand-maintained post list
  avoids a manual step (remembering to register a new post somewhere) that
  a bulk-import scan makes unnecessary — one less place for a new post to
  be forgotten.
- The eager-vs-lazy-glob distinction is called out explicitly because it's
  an easy mistake in a Vite+MDX blog specifically: an eager glob quietly
  bundles every post's entire rendered content into whichever page uses the
  glob (typically the list page), which would only become a visible
  problem once the blog has enough posts to notice the bloated bundle —
  worth deciding correctly up front rather than discovering it later.

## Sources

- [kentcdodds/mdx-bundler issue #26 — co-locating images with MDX](https://github.com/kentcdodds/mdx-bundler/issues/26) —
  folder-per-post pattern and its Next.js-specific caveat.
- [mmazzarolo.com — relative image paths in Next.js MDX](https://mmazzarolo.com/blog/2023-07-30-nextjs-mdx-image-source/) —
  confirms the folder-per-post blocker is Next.js-specific (the `/public`
  requirement), not a general MDX limitation.
- [connormckelvey.com — Generating a Blog with Vite, MDX, and Remix](https://www.connormckelvey.com/posts/2024-05-08-generating-blog-vite-mdx-remix) —
  a Vite+MDX blog architecture close to this project's stack, including the
  `import.meta.glob` post-discovery pattern and the eager-bundling caveat.
- [brillout/vite-plugin-mdx](https://github.com/brillout/vite-plugin-mdx) —
  Vite MDX integration reference.
- [nishant.is-a.dev — Slugs, Filenames, and the Art of Not Breaking Your Blog](https://nishant.is-a.dev/blog/slugs-vs-filenames) —
  reasoning for decoupling slugs from filenames/dates.
- [theserverside.com — kebab-case URL naming convention](https://www.theserverside.com/blog/Coffee-Talk-Java-News-Stories-and-Opinions/Why-you-should-make-kebab-case-a-URL-naming-convention-best-practice) —
  kebab-case-for-URLs rationale.
