# Styling Conventions

Researched: 2026-07-04. Decided: 2026-07-04.

How CSS Modules are used day-to-day, building on the CSS Modules decision
in [../ui-ux/design-system.md](../ui-ux/design-system.md). File *placement*
of global styles (`src/styles/`) is covered in
[file-hierarchy-and-complexity.md](./file-hierarchy-and-complexity.md); this
topic covers the conventions within and around those files.

## Decision

**1:1 component-to-module rule, with an exception for genuinely
style-free components.** Every component with any component-specific CSS
gets its own same-named `.module.css` file (`button.tsx` +
`button.module.css`, colocated). A component that is purely structural —
styled entirely by its children, global styles, or Base UI's own unstyled
behavior with no custom CSS of its own — does not need an empty module
file created just for consistency's sake.

**Global tokens split by category, combined through one entry point.**
Global CSS custom properties live in separate category files
(`colors.css`, `typography.css`, `spacing.css`, and similar as needed),
each theme-invariant unless noted below. One `globals.css` `@import`s each
category file, and only `globals.css` itself is imported once, from
`__root.tsx` — category files are never imported individually at the root.

**Theme (light/dark) variants live in `colors.css`, scoped by
`[data-theme]`.** Since color is what actually varies between themes,
light/dark variants are concentrated in the same file as the rest of the
color tokens (scoped via `[data-theme="light"]` / `[data-theme="dark"]`
selectors) rather than split into separate theme files — keeping
theme-variant and theme-invariant color tokens together in one place.

**Custom property naming: `--category-subcategory-variant`**, kebab-case
(e.g. `--color-brand-primary`, `--space-md`, `--font-size-lg`).

**CSS Modules class names: camelCase**, not kebab-case — a deliberate
exception to the project's otherwise-universal kebab-case convention (see
[naming-and-casing.md](./naming-and-casing.md)), because camelCase class
names enable dot-notation JS access (`styles.myClass`) instead of the
awkward bracket notation (`styles['my-class']`) kebab-case would require.

**Nesting depth and `:global()`:** no hard nesting-depth limit — rely on
judgment and readability, consistent with the same approach already taken
for folder nesting in
[file-hierarchy-and-complexity.md](./file-hierarchy-and-complexity.md).
`:global()` is reserved for cases with no other option — e.g. targeting a
third-party or Base UI component's internal classes that aren't reachable
via its own `className`/`data-*` attribute hooks — not used as a general
convenience escape hatch.

## Reasoning

- The 1:1-with-exceptions rule avoids two failure modes: scattering styling
  logic outside its component (if the rule were skipped freely) and
  cluttering the codebase with pointless empty files (if the rule had zero
  exceptions) — the exception is narrow (truly zero component-specific
  CSS), not a loophole for skipping modules out of laziness.
- Category-split global files with a single combining entry point mirrors
  documented real-world CSS-Modules-plus-design-tokens practice, and keeps
  each category file focused and independently readable rather than one
  large `tokens.css` covering everything.
- Concentrating theme variants in `colors.css` (rather than separate
  `light.css`/`dark.css` files) was chosen because color is the token
  category that actually changes between themes in this project — spacing
  and typography tokens are theme-invariant, so a separate themes/ split
  would mostly just be empty/pass-through files for those categories.
- camelCase CSS Modules class names are a deliberate, well-justified
  exception to the project's kebab-case default: the reason for kebab-case
  elsewhere (file/folder naming, avoiding cross-OS case-sensitivity issues)
  doesn't apply to CSS class names, while the JS-interop ergonomics
  (dot-notation vs. bracket notation) are a real, practical reason to
  diverge here specifically.
- No hard nesting-depth limit and a narrow `:global()` policy both follow
  the same judgment-over-arbitrary-rule approach already applied to folder
  depth in [file-hierarchy-and-complexity.md](./file-hierarchy-and-complexity.md) —
  consistent reasoning applied to a parallel question.

## Sources

- [rsbuild.rs/guide/styling/css-modules](https://rsbuild.rs/guide/styling/css-modules),
  [medium.com/@vaibhav11t — CSS best practices for React projects](https://medium.com/@vaibhav11t/css-best-practices-for-react-projects-scaling-with-confidence-8ef300801193) —
  1:1 component-to-module convention, colocation.
- [uxpin.com — managing global styles with design tokens](https://www.uxpin.com/studio/blog/managing-global-styles-in-react-with-design-tokens/),
  [dev.to/snappy_tools — CSS custom properties](https://dev.to/snappy_tools/css-custom-properties-the-modern-way-to-manage-design-tokens-1ohg) —
  category-split global token files, combined import strategy.
- [penpot.app — the developer's guide to design tokens and CSS variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/) —
  `--category-subcategory-variant` custom property naming convention.
- [bennadel.com — dark mode via CSS custom properties](https://www.bennadel.com/blog/4168-i-finally-implemented-dark-mode-using-css-custom-properties-on-this-blog.htm),
  [namastedev.com — custom properties and themes in modern CSS](https://namastedev.com/blog/how-to-use-custom-properties-and-themes-in-modern-css/) —
  theme-variant token placement patterns.
- [github.com/css-modules/css-modules — naming.md](https://github.com/css-modules/css-modules/blob/master/docs/naming.md),
  [mvolkmann.github.io/blog/css-modules](https://mvolkmann.github.io/blog/css-modules/?v=1.1.1) —
  camelCase CSS Modules class names for JS dot-notation access.
