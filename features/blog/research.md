# Research Traceability: Blog

Every decision this feature implements traces to an already-decided
`research/*.md` doc or a `high-level-guidance/design/*.md` artifact. No
decision is improvised here; the few narrow, feature-local choices (values the
research left open — prose max-width, syntax-highlight token derivation, the
`validateSearch` schema-vs-adapter detail) are recorded in the "Notes" section
below rather than left implicit — per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md).

## High-level design

- [../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md)
  — minimalist monospace personal site with a blog of MDX posts committed into
  source; match the mockups; open-source-only components.
- [../../high-level-guidance/design/blog-page.png](../../high-level-guidance/design/blog-page.png)
  — the blog list's row layout (date / title / one-line description) this
  feature reproduces.

## Content pipeline (MDX)

- [../../research/technologies/mdx-rendering.md](../../research/technologies/mdx-rendering.md)
  — `@mdx-js/rollup` in the Vite pipeline (not `@next/mdx`), with
  `remark-frontmatter` + `remark-mdx-frontmatter` exposing frontmatter as a
  plain module export.
- [../../research/documentation-content-conventions/blog-frontmatter-schema.md](../../research/documentation-content-conventions/blog-frontmatter-schema.md)
  — required `title`/`date`/`description`, optional `updated`/`tags`/`draft`/
  `coverImage`, no `author`/`slug`/`license`; a **Zod** schema validates the
  `frontmatter` export at build time and is the single source of its TS type.
- [../../research/documentation-content-conventions/blog-content-structure-and-naming.md](../../research/documentation-content-conventions/blog-content-structure-and-naming.md)
  — folder-per-post (`blog/posts/<slug>/index.mdx` + co-located images),
  kebab-case slug with no date prefix, **lazy** `import.meta.glob` discovery
  (never eagerly bundling post bodies into the list).
- [../../research/documentation-content-conventions/mdx-authoring-conventions.md](../../research/documentation-content-conventions/mdx-authoring-conventions.md)
  — build-time **Shiki** highlighting via `rehype-pretty-code` (unstyled,
  token-driven), a global `<Callout>` component, and
  `remark-lint-no-empty-image-alt-text` enforcing alt text at build time.
- [../../research/documentation-content-conventions/index.md](../../research/documentation-content-conventions/index.md)
  — the umbrella status confirming all four content-convention topics above are
  decided.

## Page content and layout

- [../../research/ui-ux/pages/site-wide/pages/blog-list.md](../../research/ui-ux/pages/site-wide/pages/blog-list.md)
  — the list page: reverse-chron CSS-grid rows (date / title / description /
  inline tags), infinite scroll, a search bar and a sidebar of toggleable tag
  filters "in the same style as the lit tracker's."
- [../../research/ui-ux/pages/site-wide/pages/blog-post.md](../../research/ui-ux/pages/site-wide/pages/blog-post.md)
  — the post page: header block (title/date/tags + back-to-list), prose
  constrained to a readable max width, code/image/footnote support styled from
  the site's own tokens rather than a third-party syntax theme.
- [../../research/ui-ux/pages/lit-tracker/pages/collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
  — the reference for the shared search-bar + toggleable-tag-sidebar look this
  feature **originates** (the collection view describes the same sidebar
  interaction and links back to the blog list as the shared style); the blog
  builds it first, the Lit Tracker reuses it.
- [../../research/ui-ux/pages/site-wide/components/header.md](../../research/ui-ux/pages/site-wide/components/header.md)
  — the shared sticky header these pages render inside (already built by
  `app-shell-and-home`; reused, not rebuilt).
- [../../research/ui-ux/design-system.md](../../research/ui-ux/design-system.md)
  — CSS Modules from global tokens, Base UI primitives, JetBrains Mono,
  light/dark theming, Lucide icons; the **reactive-feedback defaults**
  (skeleton over spinner, plain-text empty state) the list uses; the
  **responsive** conventions (media queries at ~768/1024px for page-level
  shifts like the filter sidebar reflow, container queries for reusable
  components, `clamp()` type); the simplicity philosophy the styling follows.

## State management (search / filter)

- [../../research/coding-conventions/state-management-conventions.md](../../research/coding-conventions/state-management-conventions.md)
  — shareable/bookmarkable list state (search text, selected tags) goes in
  **TanStack Router search params**, Zod-validated via `validateSearch` and
  read through `useSearch()` — not local component state; transient UI state
  (a control's open/closed) stays local. Also the source of the flagged
  `@tanstack/zod-adapter`/Zod-4 caveat recorded in Notes below.

## Content licensing

- [../../research/licensing/blog-and-content-licensing.md](../../research/licensing/blog-and-content-licensing.md)
  — blog content is **CC BY 4.0**, expressed once as a root `LICENSE` carve-out
  for `blog/` (distinct from the code's Apache-2.0), **not** a per-post
  frontmatter field.

## Layout, conventions, and code style

- [../../research/coding-conventions/file-hierarchy-and-complexity.md](../../research/coding-conventions/file-hierarchy-and-complexity.md)
  — top-level layout: where the `blog/` content root, the frontmatter schema,
  and the post-discovery data layer live relative to `src/`.
- [../../research/coding-conventions/styling-conventions.md](../../research/coding-conventions/styling-conventions.md)
  — 1:1 component-to-`.module.css`, token-driven styling, `composes:` for
  shared declarations; motion opt-in behind `prefers-reduced-motion`.
- [../../research/coding-conventions/naming-and-casing.md](../../research/coding-conventions/naming-and-casing.md),
  [../../research/coding-conventions/component-and-export-conventions.md](../../research/coding-conventions/component-and-export-conventions.md),
  [../../research/coding-conventions/typescript-conventions.md](../../research/coding-conventions/typescript-conventions.md),
  [../../research/coding-conventions/import-conventions.md](../../research/coding-conventions/import-conventions.md)
  — kebab-case files, named exports, function-declaration components, `strict`
  TS, import grouping — matching the home/about-page precedent.

## System architecture / hosting

- [../../research/system-architecture/monorepo-structure.md](../../research/system-architecture/monorepo-structure.md)
  — single TanStack Start package; `/blog` and `/blog/$slug` are routes in the
  `(personal-site)` group, rendered by its layout/header shell.
- [../../research/devops-deployment/containerization-and-build.md](../../research/devops-deployment/containerization-and-build.md)
  — the production image runs `.output/server/index.mjs`; MDX compilation and
  Shiki highlighting happen at **build time**, so the shipped server serves
  pre-rendered content with no highlighter or MDX-runtime dependency added to
  the image.
- [../../research/devops-deployment/ci-pipeline.md](../../research/devops-deployment/ci-pipeline.md)
  — CI builds the real posts, so malformed frontmatter or a missing image
  alt-text fails the pipeline (the build-time validation gate).
- [../../research/security-privacy/app-security-headers.md](../../research/security-privacy/app-security-headers.md)
  — `default-src 'self'` CSP: build-time highlighting and self-hosted assets
  keep blog pages same-origin with no third-party script/style exceptions.

## Accessibility

- [../../research/accessibility/conformance-target.md](../../research/accessibility/conformance-target.md)
  — WCAG 2.2 AA, site-wide.
- [../../research/accessibility/color-contrast-and-focus-visibility.md](../../research/accessibility/color-contrast-and-focus-visibility.md),
  [../../research/accessibility/keyboard-and-focus-management.md](../../research/accessibility/keyboard-and-focus-management.md),
  [../../research/accessibility/semantic-markup-and-aria-conventions.md](../../research/accessibility/semantic-markup-and-aria-conventions.md)
  — link/row contrast and focus visibility, focus handoff to the page heading,
  semantic markup and accessible names/pressed-state for the search field and
  tag toggles; the alt-text mandate the MDX pipeline enforces mechanically.

## Testing

- [../../research/testing-qa/test-runner-and-frameworks.md](../../research/testing-qa/test-runner-and-frameworks.md)
  — Vitest + Testing Library; pure-function testing for the search predicate,
  sort, and date formatting; schema unit tests for frontmatter validation.
- [../../research/testing-qa/e2e-testing.md](../../research/testing-qa/e2e-testing.md)
  — Playwright, assert on settled DOM and settled URL search params (the
  flagged Start+Playwright timing caveat applies to the filter tests).
- [../../research/testing-qa/test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md)
  — ratchet coverage; the build-time frontmatter/alt-text validation is an
  additional gate.
- [../../research/testing-qa/accessibility-testing.md](../../research/testing-qa/accessibility-testing.md),
  [../../research/accessibility/testing-and-tooling.md](../../research/accessibility/testing-and-tooling.md)
  — `@axe-core/playwright` inline on `/blog` and a post page in both themes.

## Project-management process

- [../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md)
  — the feature/task folder structure and per-task PR gating.
- [../../research/project-management-conventions/issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md)
  — GitHub Issues + native sub-issues; self-assign to claim; PR closing
  keywords.
- [../../research/project-management-conventions/commit-message-conventions.md](../../research/project-management-conventions/commit-message-conventions.md)
  — Conventional Commits on PR titles.

## Notes / narrower research (feature-local, not global)

- **Prose max-width value.** `blog-post.md` decides prose is "constrained to a
  readable max width" but fixes no value, and no token exists yet. The
  implementation introduces a documented content-width token (a `ch`- or
  `rem`-based measure in the ~60–75ch readability range) in the design-token
  stylesheet, used by the post page. This is a narrow value choice within an
  already-decided constraint, recorded here rather than as a global `research/`
  decision.
- **Syntax-highlight colors are authored from existing tokens.**
  `blog-post.md`/`mdx-authoring-conventions.md` mandate code styling from the
  site's own tokens (`rehype-pretty-code` is unstyled and forbids a mismatched
  third-party theme), but no highlight tokens exist in `colors.css` yet. The
  implementation adds a small set of syntax tokens **derived from the existing
  `--color-*` palette**, themed for light/dark like every other token — not a
  new external theme package.
- **`validateSearch` schema without the Zod adapter.**
  `state-management-conventions.md` flags that `@tanstack/zod-adapter` pins a
  Zod 3.x peer while the repo is on Zod 4; the search-param schema is therefore
  passed to `validateSearch` **directly** (Zod 4 schemas are callable
  validators) rather than through the adapter. This is the resolution that doc
  left to "whenever Zod's version is settled" — settled here as Zod 4.
- **Infinite scroll is client-side progressive rendering.** The blog is fully
  static (no Zero/data layer), so the list's "infinite scroll"
  (`blog-list.md`) renders progressively from the already-available static
  metadata set — not server/cursor pagination. Called out so the
  implementation doesn't reach for a data-fetching mechanism that doesn't
  exist in this stack.
- **Lazy-vs-eager glob is a load-bearing detail.**
  `blog-content-structure-and-naming.md` explicitly warns that an *eager*
  `import.meta.glob` silently bundles every post's full body into the list
  page. The list data layer must use the lazy form and pull only frontmatter
  for the list; the post body loads only on the post route. Repeated here
  because it is the easy Vite+MDX mistake and is verified by the "no post-body
  in the list bundle" expectation.
- **Sitemap / RSS / structured data are deferred, not forgotten.** No research
  covers them; per the user's meta-and-OG-only decision they are explicitly out
  of scope for this feature (see
  [constraints-and-behavior.md](./constraints-and-behavior.md)) and would be a
  separately-scoped later effort with its own research if pursued.
