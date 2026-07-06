# Research: Coding Conventions

Status: 10/10 researched and decided (2026-07-04).

Language/style conventions, linting/formatting tooling, and code
organization patterns to adopt across the project. Builds on
[../system-architecture/monorepo-structure.md](../system-architecture/monorepo-structure.md)
(single TanStack Start package) — this category is where that decision's
deferred folder/naming conventions land.

## Topics

- [formatting-and-linting.md](./formatting-and-linting.md) — Decided.
  Biome (single tool, official TanStack Start scaffolding support) enforced
  via pre-commit hook (staged-file autofix) plus CI (full project-wide
  check, the real gate).
- [naming-and-casing.md](./naming-and-casing.md) — Decided. PascalCase
  components/types/enums, camelCase variables/functions/hooks (`use`
  prefix), UPPER_SNAKE_CASE only for true constants, kebab-case files and
  route-group folders, barrels allowed only at stable module boundaries.
- [typescript-conventions.md](./typescript-conventions.md) — Decided.
  `strict` plus low-friction extras (`noUncheckedIndexedAccess` etc., but
  not `exactOptionalPropertyTypes`), `interface`-for-shapes/`type`-for-unions,
  `unknown` over `any`, client/server types shared via TanStack Start's
  Import Protection suffix convention with a Drizzle-generated Zero schema
  (see
  [../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md))
  as the shared data-shape source.
- [component-and-export-conventions.md](./component-and-export-conventions.md) —
  Decided. Named exports only (Fast Refresh requirement), function
  declarations for components, always a named `FooProps` interface, and a
  defined within-file ordering (types → hooks → derived values → handlers →
  early returns → render).
- [file-hierarchy-and-complexity.md](./file-hierarchy-and-complexity.md) —
  Decided. Split into a folder when real siblings appear (not by line
  count), colocate tests/styles/sub-components, feature-based top-level
  organization with a shared layer promoted on the 2nd consumer, no
  explicit depth limit. Also specifies a concrete top-level layout (`src/`
  wrapper, `routes/`, per-feature `lib/`/`utils/`/`server/`,
  `src/db/schema.ts` (Drizzle, canonical) generating `zero/schema.ts`,
  `styles/`, root-level Docker/env/`drizzle.config.ts`/`drizzle/` files).
- [code-comments.md](./code-comments.md) — Decided. Comments explain "why"
  not "what"; `/** */` reserved exclusively for TSDoc (required on exports,
  optional internally), `//` for everything else; no bare comments in JSX
  children, no commented-out code; TODOs use `// TODO(#issue): description`.
- [styling-conventions.md](./styling-conventions.md) — Decided. 1:1
  component-to-`.module.css` (skip only if truly style-free), global tokens
  split by category (`colors.css`, `typography.css`, `spacing.css`, ...)
  combined via one `globals.css`, theme variants concentrated in
  `colors.css` via `[data-theme]`, camelCase CSS Module class names.
- [import-conventions.md](./import-conventions.md) — Decided. Hybrid:
  relative imports for nearby colocated code, `~/` alias for cross-cutting
  imports; Biome `organizeImports` group ordering (Node → external → alias
  → relative → CSS); inline `import { type Foo, bar }` style.
- [state-management-conventions.md](./state-management-conventions.md) —
  Decided. No global state library (Zero already owns server state);
  shareable UI state (filters/sort/tabs) goes in Zod-validated search
  params; transient UI state is local `useState`; theme preference bypasses
  React entirely (inline script + `data-theme` + `localStorage`); avoid
  Context as a default.
- [hook-extraction-conventions.md](./hook-extraction-conventions.md) —
  Decided. Extraction allowed for readability alone (not just reuse), no
  numeric threshold, bundling multiple hooks into one is good practice,
  only prefix `useX` if hooks are actually called internally, tuple vs.
  object return shape by value count.
