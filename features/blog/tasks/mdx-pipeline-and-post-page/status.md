# Status: MDX Pipeline + Post Page

**State:** Implemented, in review (2026-07-07). All local gates green (Biome,
typecheck incl. `cmk`, 112 unit tests, 26 e2e against the production build,
coverage 54.94% ≥ the 52.38% main baseline), plus a manual both-themes visual
check of a rendered post and a verified build-time alt-text failure.

- Branch: `blog/mdx-pipeline-and-post-page`.
- Sub-issue: [#24](https://github.com/nicbk/nicbk-website/issues/24)
  (parent [#23](https://github.com/nicbk/nicbk-website/issues/23)); self-assigned.
- PR / CI / review: _pending push._

## What shipped

- **MDX pipeline** (`blog/mdx-plugins.ts`, wired into `vite.config.ts` and
  mirrored in `vitest.config.ts`): `@mdx-js/rollup` (`enforce: 'pre'`, before
  `viteReact` which now includes `.mdx`) with `remark-frontmatter` +
  `remark-mdx-frontmatter` (→ `export const frontmatter`), `rehype-pretty-code`
  (build-time Shiki), and a custom alt-text gate.
- **Content root** at the repo-level `blog/`: `blog/posts/<slug>/index.mdx`
  (three sample posts, one `draft: true`, one with a co-located SVG image),
  `blog/frontmatter-schema.ts` (Zod, single source of the FM type),
  `blog/posts.ts` (lazy `import.meta.glob` discovery; frontmatter-only + content
  loaders).
- **Route** `src/routes/(personal-site)/blog.$slug.tsx`: the app's first
  `loader` (thin wrapper over `-lib/load-post.ts`, throwing `notFound()` on an
  unknown slug) and first per-page `head()` (via `-utils/post-head.ts`, title +
  description + OG). The MDX body loads via `React.lazy` over the per-post glob
  entry, so each post is its own code-split chunk.
- **Components** (`-components/`): `blog-post-page` (header block + max-width
  prose), global `<Callout>`, `img` override (`blog-image`), shared inline
  `post-tags`. `-utils/format-date.ts` for UTC date formatting.
- **Tokens**: `--prose-max-width` (typography.css) and palette-derived
  `--shiki-*` syntax colors (colors.css), audited AA against the code surface
  in `contrast.test.ts`.
- **Licensing**: root `LICENSE` (full Apache-2.0 + a `blog/` CC BY 4.0
  carve-out) and `"license": "Apache-2.0"` in package.json — this closed a
  pre-existing gap (no LICENSE existed).

## Decisions / deviations (worth a reviewer's eye)

- **Alt-text enforcement is a custom `file.fail()` remark plugin**, not
  `remark-lint-no-empty-image-alt-text`. That package is unmaintained (2021)
  and only *warns*, so it would not fail the build as required. The custom
  plugin hard-fails deterministically (verified: a bad-alt image aborts
  `npm run build` with the offending location) and adds no stale dependency.
- **Syntax colors come from `createCssVariablesTheme`** (Shiki's `css-variables`
  built-in theme was removed), mapping token scopes to `--shiki-*` CSS vars
  defined per theme in colors.css — honoring "own tokens, not a third-party
  syntax theme." Confirmed no highlighter engine ships to the client.
- **`/blog` placeholder moved `blog.tsx` → `blog.index.tsx`** (content
  unchanged) so `/blog` and `/blog/$slug` are siblings; as a flat `blog.tsx`,
  TanStack treated it as a parent layout with no `<Outlet/>` and the post never
  rendered. Task 2 replaces this index with the real list.
- **`blog/` is reachable via a new `~blog/*` tsconfig alias** and added to
  `tsconfig.json` `include`; a small ambient `blog/mdx.d.ts` types `.mdx`
  imports. New Biome overrides: allow the `$`-param route filename and the
  ambient `.d.ts` default export.

## Not in this task

- The `/blog` list page (task 2), search/tag filtering (task 3), and
  sitemap/RSS/structured data (out of scope for the whole feature).

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; first of three.
- 2026-07-07 — Implemented on branch `blog/mdx-pipeline-and-post-page` (#24
  self-assigned). Pipeline proven end-to-end on three real posts; unit + e2e
  (incl. unknown-slug real 404 and axe both themes) added; both-theme visual
  check done. Awaiting PR + CI + review.
