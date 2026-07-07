# Constraints and Behavior: MDX Pipeline + Post Page

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md) — the
"Content pipeline" and "Blog post page" sections, the metadata section for the
post route, plus the cross-cutting quality bar):

## Content pipeline

- Posts live at `blog/posts/<slug>/index.mdx` with co-located images imported
  via Vite; the slug is the folder name (kebab-case, no date prefix).
- Post discovery uses **lazy** `import.meta.glob` (dynamic-`import()` form); a
  post's body is only loaded when that post is rendered — never eagerly bundled.
- Every post's frontmatter is validated at build/SSR time against the Zod
  schema (required `title`/`date`/`description`; optional
  `updated`/`tags`/`draft`/`coverImage`); invalid frontmatter throws rather than
  rendering a broken post. No `author`/`slug`/`license` field exists.
- Code blocks are highlighted at build time (Shiki via `rehype-pretty-code`),
  styled from the new token-derived syntax colors; no highlighter JS ships to
  the client.
- An image with missing/empty alt text fails the build
  (`remark-lint-no-empty-image-alt-text`).
- The global `<Callout>` is usable in a post with no per-file import.

## Post page

- `/blog/<slug>` renders the compiled MDX with a header block (title, date,
  `updated` only when present, inline tags matching the list's tag style, and a
  "back to blog list" link to `/blog`), and the body in a **readable max-width
  prose column**, correct in both themes.
- The route sets its own document `<title>`, `meta name="description"` (from
  frontmatter), and basic Open Graph tags (using `coverImage` when present).
- An **unknown slug** returns a real **HTTP 404** and the site's not-found
  treatment, not an empty/broken post.
- The page has a valid heading structure with a main heading the shell's
  client-navigation focus handoff can target.

## Cross-cutting quality

- WCAG 2.2 AA: link/text contrast and visible focus indicators in both themes;
  the "back to list" link and any in-content links have discernible accessible
  names; code and prose meet contrast in both themes.
- Renders identically under `npm run dev` and the production Nitro server; MDX
  compilation and highlighting are build-time, so the shipped image gains no
  highlighter/MDX-runtime dependency.
- CI passes, including the build-time frontmatter/alt-text validation on the
  committed sample posts.

## Behavior details

- **Highlighting is build-time, not runtime** — verified by the absence of a
  syntax-highlighter runtime bundle on the post page.
- **Prose width and syntax colors are tokens**, not per-component literals — a
  documented content-width token and palette-derived syntax tokens in the
  design-token stylesheets.

## Dependencies

- The shell/header/tokens/theming and `public/`-adjacent conventions from
  [`app-shell-and-home`](../../../app-shell-and-home/description.md) (the
  `(personal-site)` layout, focus handoff, design-token stylesheets this task
  extends).
- Zod (already a project dependency) for the frontmatter schema.

## Provides to later tasks

- The Zod frontmatter schema + type, the `import.meta.glob` post-discovery data
  layer, the MDX component provider, and the design tokens — all consumed by
  `blog-list-page` (task 2) and `blog-search-and-filter` (task 3).
