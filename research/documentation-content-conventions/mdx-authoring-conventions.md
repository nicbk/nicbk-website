# MDX Authoring Conventions

Researched: 2026-07-05. Decided: 2026-07-05.

What's available to a blog post author beyond plain Markdown — code-block
syntax highlighting, callouts/admonitions, and image handling — and how the
already-decided accessible-name/alt-text mandate
([../accessibility/semantic-markup-and-aria-conventions.md](../accessibility/semantic-markup-and-aria-conventions.md))
is enforced for blog images specifically.

## Decision

- **Syntax-highlighted code blocks: build-time highlighting via Shiki**,
  through `rehype-pretty-code`. Highlighting happens during the build, not
  in the browser — no highlighter JS library ships to the client, matching
  a content-focused static blog's needs. `rehype-pretty-code` is unstyled
  by default (it emits data attributes for styling hooks), which fits this
  project's existing unstyled-primitives/CSS-Modules approach (see
  [../ui-ux/design-system.md](../ui-ux/design-system.md)) rather than
  pulling in a pre-styled theme package.
- **Callouts: a small custom `<Callout type="note" | "warning" | "tip">`
  MDX component**, registered globally via MDX's `components`
  prop/provider so any post can use it without a per-file import. Styled as
  a CSS Module like any other component, consistent with the rest of the
  design system.
- **Images: a custom `img` override registered the same way, enforcing
  alt text mechanically rather than by author discipline** — combined with
  **`remark-lint-no-empty-image-alt-text`** plugged into the existing
  remark pipeline (already running `remark-frontmatter` +
  `remark-mdx-frontmatter`, per
  [../technologies/mdx-rendering.md](../technologies/mdx-rendering.md)), so
  a build fails if any post image has no (or empty) alt text.
- **No new lint tool beyond the remark pipeline already in place.** The
  alt-text rule above is a `remark-lint` plugin, not an ESLint rule — this
  project's static linting is Biome-only (see
  [../coding-conventions/formatting-and-linting.md](../coding-conventions/formatting-and-linting.md)),
  and the remark/rehype pipeline already exists for MDX processing
  regardless, so this adds one plugin to an existing pipeline rather than a
  second linting tool.

## Reasoning

- Build-time (Shiki) over runtime (client-side Prism or similar) highlighting
  was chosen because this blog's content is static at build time (MDX
  committed into source, per
  [DESIGN.md](../../high-level-guidance/design/DESIGN.md)) — there's no
  runtime reason to ship a highlighting library to every visitor's browser
  when the highlighted output can be computed once, at build time, and
  served as plain styled HTML.
- `rehype-pretty-code`'s unstyled-by-default output was preferred over a
  pre-themed alternative for the same reason Base UI was chosen over a
  pre-styled component library in
  [../ui-ux/design-system.md](../ui-ux/design-system.md) — styling stays in
  this project's own CSS Modules/design-token system rather than being
  fought against or overridden from a third-party theme.
- A global `Callout` component (rather than expecting each post to import
  one) removes friction from writing a post — the same low-friction design
  philosophy already governing UI decisions applies equally to the
  authoring experience for blog content.
- Enforcing alt text via `remark-lint-no-empty-image-alt-text` — rather
  than relying on the author remembering every time — turns the
  already-decided accessibility requirement into something a build
  mechanically checks, the same reasoning already used for
  critical/serious-severity CI blocking in
  [../accessibility/testing-and-tooling.md](../accessibility/testing-and-tooling.md):
  automated enforcement where it's mechanically possible, rather than
  trusting discipline alone.
- Reusing the existing remark pipeline for the alt-text rule (instead of
  adding ESLint's `markdown/require-alt-text`) avoids introducing a second
  linting tool into an otherwise Biome-only project for the sake of one
  rule — directly following
  [AGENTS.md](../../AGENTS.md)'s "Avoid duplication" guidance at the
  tooling level, not just the content level.

## Sources

- [rehype-pretty-code](https://github.com/rehype-pretty/rehype-pretty-code) —
  the rehype plugin wrapping Shiki for build-time, unstyled-by-default code
  highlighting.
- [rehype-pretty.pages.dev](https://rehype-pretty.pages.dev/) —
  `rehype-pretty-code` documentation and usage patterns.
- [velite.js.org — code highlighting guide](https://velite.js.org/guide/code-highlighting) —
  confirms Shiki/build-time highlighting as current (2025-2026) practice
  over client-runtime alternatives.
- [Docusaurus — Admonitions](https://docusaurus.io/docs/markdown-features/admonitions) —
  reference implementation of the callout/admonition pattern this decision
  follows.
- [MDXEditor — Admonitions](https://mdxeditor.dev/editor/docs/Admonitions) —
  additional prior art for the same pattern.
- [salesforce/remark-lint-no-empty-image-alt-text](https://github.com/salesforce/remark-lint-no-empty-image-alt-text) —
  the remark-lint plugin enforcing non-empty image alt text at build time.
- [remarkjs/remark-lint](https://github.com/remarkjs/remark-lint) — the
  remark-lint framework this plugin runs under.
- [eslint/markdown require-alt-text rule](https://github.com/eslint/markdown/blob/HEAD/docs/rules/require-alt-text.md) —
  the ESLint-based alternative considered and not chosen, to avoid a
  second lint tool alongside Biome.
