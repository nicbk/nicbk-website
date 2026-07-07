# Constraints and Behavior: Blog

Acceptance criteria for the feature as a whole. Each task's own
`constraints-and-behavior.md` states which of these it satisfies.

## Content pipeline

- Blog posts are **MDX files committed into source** at
  `blog/posts/<slug>/index.mdx`, with any images the post uses **co-located**
  in the same folder and imported via normal Vite asset imports. The slug is
  the folder name (kebab-case, **no date prefix**).
- Posts are **discovered via lazy `import.meta.glob`** (`blog/posts/*/index.mdx`,
  dynamic-`import()` form, not eager) so the list page bundles only each post's
  frontmatter/metadata, and a post's full MDX body loads only when that post's
  own page is visited.
- Every post declares frontmatter validated at **build time** against a shared
  **Zod** schema (`blog/frontmatter-schema.ts`): required `title` (string),
  `date` (publish date), `description` (string); optional `updated`, `tags`
  (string array), `draft` (boolean, default `false`), `coverImage`. A missing
  required field or malformed `date` **fails the build** rather than rendering
  a broken row. The Zod schema is the single source of the frontmatter
  TypeScript type (via `z.infer`). There is **no** `author`, `slug`, or
  `license` frontmatter field.
- Code blocks are highlighted at **build time via Shiki** (`rehype-pretty-code`,
  unstyled — colors come from this project's own tokens, not a third-party
  syntax theme). No syntax-highlighter JS ships to the client.
- Post images go through a custom `img` override, and
  `remark-lint-no-empty-image-alt-text` **fails the build** on any image with
  missing/empty alt text (mechanical enforcement of the site-wide alt-text
  mandate).
- A global `<Callout type="note" | "warning" | "tip">` component is available
  to any post without a per-file import.

## Blog list page (`/blog`)

- Renders a **flat, reverse-chronological** (newest first, by frontmatter
  `date`) list, matching
  [blog-page.png](../../high-level-guidance/design/blog-page.png): a **CSS grid**
  whose columns (date / title / one-line description) align down the page, with
  **tags shown inline** after the description (not a separate pill/badge
  treatment).
- Dates and descriptions use the muted/secondary text token; the title uses the
  primary text color/weight — the emphasis-by-color convention from the mockup.
- **Draft posts** (`draft: true`) are excluded from the production list/build
  output.
- **Pagination is infinite scroll** (not numbered pagination) — progressive
  rendering of the static metadata list.
- **Empty state:** if no (non-draft) posts exist, plain inline text — no
  illustration, no spinner (per the design system's reactive-feedback default).
- Each row is a link to that post's `/blog/<slug>` page.

## Blog post page (`/blog/<slug>`)

- Renders the post's compiled MDX with a **header block**: title, date (and
  `updated` only when present), tags (same inline tag style as the list), and a
  **"back to blog list"** link.
- **Prose is constrained to a readable max width** (not full-page width);
  long-form text reads in a narrower column.
- MDX features — code blocks (highlighted), images (co-located, alt-text
  enforced), and footnotes — are styled consistently with the site's
  monospace/dark-and-light design tokens.
- An unknown slug renders the site's not-found treatment (real HTTP 404), not a
  broken/empty post.

## Search and tag filtering

- A **search bar** filters the list live-as-you-type, matching post **title,
  description, and tags**.
- A **sidebar of toggleable tag filters** narrows the list to posts carrying
  the selected tag(s); multiple tags are multi-select.
- Search text and selected tags live in **TanStack Router search params**
  (Zod-validated via `validateSearch`, read via `useSearch`), so a
  filtered/searched view is **linkable, bookmarkable, and survives refresh and
  back/forward** — not transient local state.
- This is the **originating** implementation of the search-bar + tag-sidebar
  style the Lit Tracker's collection view later reuses.

## Metadata / SEO

- Each blog route sets its own document `<title>`, `meta name="description"`
  (from frontmatter `description`), and basic **Open Graph** tags (using
  `coverImage` when present), via the route `head()` option + the existing
  `<HeadContent />` in `__root.tsx`.

## Cross-cutting quality

- WCAG 2.2 AA, site-wide target: 4.5:1 text / 3:1 non-text contrast in both
  themes, visible focus indicators on every link and control, accessible names
  on all controls (search field, tag toggles), valid heading structure with a
  main heading the shell's client-navigation focus handoff can target.
- Correct in both light and dark themes, with no flash of the wrong theme.
- Renders identically via `npm run dev` and the production Nitro server
  (`npm run build && npm run start`) and under `docker compose up`.
- CI (Biome, typecheck incl. CSS-Module codegen, unit tests with ratchet
  coverage, Playwright e2e + axe, PR-title lint, and the build-time
  frontmatter/alt-text validation) passes.

## Explicitly out of scope

- Any data-layer service, authentication, or reactive data.
- **Sitemap, RSS/Atom/JSON feed, canonical-URL, and JSON-LD/structured-data**
  surfaces — deferred to a separately-scoped later effort (per the user's
  meta-and-OG-only decision).
- A per-post `license`/`copyright` frontmatter field — content licensing is the
  single root `LICENSE` CC BY 4.0 carve-out for `blog/`.
- The projects page and its Lit-Tracker link (its own feature).
- A comment system, reactions, view counters, or any server-persisted post
  metadata.
