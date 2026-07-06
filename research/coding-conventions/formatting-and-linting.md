# Formatting and Linting

Researched: 2026-07-04. Decided: 2026-07-04.

What tooling enforces code formatting/linting, and at what point in the
workflow it's enforced.

## Decision

- **Tool: Biome.** A single Rust-based tool covering both formatting and
  linting, replacing the ESLint+Prettier combo. TanStack Start's own
  scaffolding CLI (`create-start`) has an official `--toolchain biome` flag
  that generates a working `biome.json`, and Biome natively covers
  React/JSX rules (rules-of-hooks, an exhaustive-deps equivalent) and
  TypeScript linting without needing separate plugins.
- **Enforcement: pre-commit hook + CI, not either alone.** A pre-commit hook
  (via lint-staged, paired with either husky or the newer/faster Lefthook)
  runs Biome's autofix against staged files only, catching issues at commit
  time with minimal friction. CI re-runs Biome's full check against the
  whole project on every push/PR — this is the actual enforcement gate,
  since pre-commit hooks are bypassable (`git commit --no-verify`).
- **Correction (2026-07-05):** this document originally stated Biome lacked
  an ESLint `jsx-a11y`-equivalent plugin ecosystem and deferred the
  question to the `accessibility/` research category. That was outdated —
  Biome has shipped a JSX/TSX `a11y` lint-rule group, enabled by default in
  its recommended ruleset, since v1.0 (further expanded in v2.4, released
  2026-02-10). See
  [../accessibility/testing-and-tooling.md](../accessibility/testing-and-tooling.md)
  for the full decision: Biome's built-in rules are the static-analysis
  layer, no supplementary tool is added, and a separate `@axe-core/playwright`
  CI check covers runtime accessibility issues linting can't catch.
- TanStack Router's generated route-tree file is excluded from Biome's
  formatting/linting via its `files.ignore` config (route-tree files are
  generated code, not hand-written).

## Reasoning

- Biome's single-tool config (one `biome.json` instead of separate
  ESLint/Prettier configs plus plugins) and official TanStack Start
  scaffolding support make it the lower-friction choice for a new project,
  and its native React/TypeScript rule coverage means no plugin-hunting is
  needed to get equivalent linting to a typical ESLint+`typescript-eslint`
  setup.
- ESLint+Prettier's main historical advantage — a deeper plugin ecosystem —
  is least relevant for accessibility linting specifically, since Biome's
  own built-in `a11y` rule group already covers that ground (see the
  correction above); the remaining edge is the most exhaustive type-aware
  lint rules, which doesn't outweigh Biome's single-tool simplicity for
  this project.
- CI as the authoritative gate (not just the pre-commit hook) follows
  standard practice: local hooks are for fast feedback and convenience, not
  guaranteed enforcement, since they can be skipped.

## Sources

- [dev.to/pockit_tools — Biome migration guide 2026](https://dev.to/pockit_tools/biome-the-eslint-and-prettier-killer-complete-migration-guide-for-2026-27m) —
  Biome vs. ESLint+Prettier performance/maturity comparison.
- [reintech.io — TypeScript Biome vs. ESLint 2026](https://reintech.io/blog/typescript-biome-vs-eslint-linting-formatting-comparison-2026) —
  TypeScript linting coverage comparison, plugin ecosystem gaps.
- [npmjs.com/package/@tanstack/create-start](https://www.npmjs.com/package/@tanstack/create-start) —
  official `--toolchain biome` scaffolding flag.
- [github.com/lint-staged/lint-staged](https://github.com/lint-staged/lint-staged) —
  staged-file pre-commit linting pattern.
- [devtoolsguide.com — linting and formatting](https://www.devtoolsguide.com/linting-and-formatting/) —
  pre-commit-hook-plus-CI enforcement pattern rationale.
