# Import Conventions

Researched: 2026-07-04. Decided: 2026-07-04.

Absolute (path-alias) vs. relative imports, import ordering/grouping, and
type-only import style.

## Decision

**Hybrid: relative imports for nearby/colocated code, `~/` alias for
cross-cutting imports.** A component importing its own colocated `-lib`/
`-utils`/sub-component siblings (per
[file-hierarchy-and-complexity.md](./file-hierarchy-and-complexity.md)'s
`routes/`-colocation pattern) uses a relative import
(`./upload.server`, `../-components/header`). Anything structurally distant
or genuinely cross-cutting — `~/zero/schema`, `~/styles/*`,
`routes/-shared/*` — uses the `~/` alias (mapped to `./src/*` via
`tsconfig.json` `paths`, matching TanStack Start's own documented example),
not a long chain of `../../..`.

**Import ordering/grouping** via Biome's `organizeImports` assist action,
configured with groups in this order: Node built-ins → external packages →
`~/`-aliased imports → relative imports → CSS/asset imports. Within each
group, natural-sort ordering (Biome's default).

**Type-only imports: inline style**
(`import { type Foo, bar } from './foo'`), not a separate `import type { Foo }`
statement — one import statement per module regardless of whether some of
its imports are type-only. Enforced via Biome's `useImportType` rule
configured to its `inlineType` style option.

## Reasoning

- The hybrid relative/alias split isn't a project-specific invention — it's
  a documented, tooling-supported pattern (there's a dedicated ESLint
  plugin enforcing exactly this split) that maps directly onto this
  project's colocation structure: code colocated in the same route subtree
  is naturally "nearby" (short relative paths), while `zero/schema.ts`,
  `styles/`, and `routes/-shared/` are structurally distant from any one
  feature and benefit from a stable alias that doesn't change if a file
  moves within its own feature folder.
- `~/` (TanStack Start's own documented alias convention) was chosen over
  the more common `@/` for consistency with the framework's own docs/
  examples, since there's no other reason to prefer one over the other.
- The Biome group ordering (Node → external → alias → relative → CSS)
  follows the natural "most foreign to most local" progression, making it
  easy to scan an import block and immediately tell how far away a given
  import is coming from.
- Inline `import { type Foo, bar }` reduces total import-statement count
  per file (relevant since this project already tends to import several
  colocated siblings per component) without losing the explicitness
  benefit of `import type` — the type-only distinction Biome's
  `useImportType` rule is enforcing is preserved either way, this is purely
  a formatting choice between the two supported styles.

## Sources

- [tanstack.com/start/latest/docs/framework/react/guide/path-aliases](https://tanstack.com/start/latest/docs/framework/react/guide/path-aliases) —
  confirms TanStack Start doesn't set up a path alias by default; its own
  documented example uses `~/` → `./src/*`.
- [oneuptime.com — configure TypeScript path aliases](https://oneuptime.com/blog/post/2026-01-24-configure-typescript-path-aliases/view) —
  general guidance on when an alias is worth adding vs. relative imports.
- [socket.dev/npm/package/eslint-plugin-relative-imports-when-same-folder](https://socket.dev/npm/package/eslint-plugin-relative-imports-when-same-folder),
  [nimblewebdeveloper.com — absolute/alias imports in JavaScript](https://nimblewebdeveloper.com/blog/absolute-alias-imports-in-javascript-vscode/) —
  the documented hybrid relative-for-nearby/alias-for-far pattern.
- [biomejs.dev/assist/actions/organize-imports](https://biomejs.dev/assist/actions/organize-imports/),
  [dev.to/realchakrawarti — Biome V2: taming your imports](https://dev.to/realchakrawarti/biome-v2-taming-your-imports-for-perfect-order-5g80) —
  Biome's `organizeImports` group configuration (`:NODE:`, `:PACKAGE:`,
  `:ALIAS:` placeholders, natural-sort default).
- [biomejs.dev/linter/rules/use-import-type](https://biomejs.dev/linter/rules/use-import-type/) —
  Biome's `useImportType` rule and its `inlineType` style option.
