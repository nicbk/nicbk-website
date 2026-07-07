# Status: MDX Pipeline + Post Page

**State:** Not started (2026-07-06).

- Branch: _not yet created_ (`blog/mdx-pipeline-and-post-page` when started).
- Sub-issue: [#24](https://github.com/nicbk/nicbk-website/issues/24)
  (parent [#23](https://github.com/nicbk/nicbk-website/issues/23)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Notes carried into implementation

- **MDX plugin ordering** in `vite.config.ts` — `@mdx-js/rollup` must be
  ordered correctly relative to `tanstackStart()`/`nitro()`/`viteReact()`;
  verify the remark/rehype chain (`remark-frontmatter` +
  `remark-mdx-frontmatter` + `rehype-pretty-code` +
  `remark-lint-no-empty-image-alt-text`) runs in the intended order.
- **Lazy glob** (`import.meta.glob(..., ` dynamic-`import()` form) for
  discovery — do not eager-import; the list task depends on frontmatter-only
  loading.
- **First `loader` and first per-page `head()`** in the app — follow the
  `__root.tsx` `head()` mechanism (`<HeadContent/>` is already wired);
  `head()` can read `loader` data.
- **Unknown slug → real HTTP 404** — verify against TanStack Start's actual
  not-found behavior, don't assume.
- New **prose-width** token and **palette-derived syntax** tokens go in the
  design-token stylesheets; run the CSS-Modules codegen (`cmk`) for any new
  `.module.css`.
- Add the root `LICENSE` **CC BY 4.0 carve-out** for `blog/`.
- Commit the 2–3 sample posts here (one `draft: true` for task 2 to exclude).

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; first of
  three.
