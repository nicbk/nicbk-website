# Feature: Blog

The personal site's blog: a **flat, reverse-chronological list** of posts at
`/blog` and an **individual post page** at `/blog/<slug>`, both rendered from
**MDX files committed into source**, matching
[blog-page.png](../../high-level-guidance/design/blog-page.png)'s row layout.

Concretely, this feature produces:

- The **MDX content pipeline**: `@mdx-js/rollup` in the Vite build, a Zod
  **frontmatter schema** validated at build time, folder-per-post discovery
  via lazy `import.meta.glob`, build-time **Shiki** code highlighting, a
  global `<Callout>` component, and build-time **alt-text enforcement** — all
  per the already-decided `research/documentation-content-conventions/` and
  `research/technologies/mdx-rendering.md`.
- The **blog list page** at `/blog`: a CSS-grid of reverse-chronological rows
  (date / title / one-line description / inline tags, columns aligned down the
  page), with infinite scroll.
- The **blog post page** at `/blog/<slug>`: a header block (title, date, tags,
  "back to list"), prose constrained to a readable max width, and MDX content
  (code blocks, images, footnotes) styled from the site's own design tokens.
- **Search and tag filtering** over the list: a live search bar and a sidebar
  of toggleable tag filters, with the active query held in URL search params
  (linkable/bookmarkable). This **originates** the search/tag-sidebar look the
  Lit Tracker's collection view later reuses.

This is the first feature to use MDX, the first to add a per-page `head()`
(document `<title>` + meta description + Open Graph) and a route `loader`, and
the first to serve content discovered by `import.meta.glob`.

## Scope boundary

Static MDX content only. This feature stands up **no** data layer, auth, or
reactive data — consistent with the rest of Phase 1. The app shell, header,
design tokens, theming, and `public/` static-asset serving this feature builds
on already exist from
[`app-shell-and-home`](../app-shell-and-home/description.md) and
[`about-page`](../about-page/description.md); they are reused, not rebuilt.

The blog is the **originator** of the search-bar + tag-filter-sidebar visual
style that `research/ui-ux/pages/site-wide/pages/blog-list.md` describes as
"the same style as the lit tracker's" — the Lit Tracker (Phase 3) reuses it
later, so building it here is the correct dependency order, not a forward
reference.

## Seed content

At least one real committed post is required for the feature to render and for
the search/filter/highlighting tests to have representative content. Per the
user's decision, the implementation session authors **2–3 real sample posts**
(exercising code blocks, a `<Callout>`, a co-located image, and varied
tags/dates), which the site owner replaces or extends with real writing later.
