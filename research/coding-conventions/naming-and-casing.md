# Naming and Casing

Researched: 2026-07-04. Decided: 2026-07-04.

Casing conventions across identifiers, file names, and route-group/folder
names — including the route-group naming explicitly deferred here from
[../system-architecture/monorepo-structure.md](../system-architecture/monorepo-structure.md).

## Decision

**Identifiers:**

- **Components:** PascalCase (`UserProfile`).
- **Hooks:** camelCase with a `use` prefix (`useAuth`).
- **Variables, functions, props, local state:** camelCase.
- **Types and interfaces:** PascalCase, for both `type` and `interface` — no
  `I`-prefix (`IUser`); that convention is dead.
- **Enums:** PascalCase name, PascalCase members (e.g. `Status.Active`, not
  `Status.ACTIVE`).
- **Constants:** UPPER_SNAKE_CASE only for true module-level/global immutable
  constants (e.g. `MAX_RETRIES`); ordinary `const`-declared local bindings
  that aren't semantically "constants" just use normal camelCase.

**File names:** kebab-case for all files (`user-profile.tsx`, containing
`export function UserProfile()`), regardless of whether the file exports a
component, hook, or utility. Kebab-case avoids case-sensitivity bugs across
filesystems (macOS/Windows are case-insensitive, Linux is case-sensitive)
and is enforceable via Biome's `useFilenamingConvention` lint rule, which
already special-cases TanStack Router's structural filename markers
(`$param` dynamic segments, `_layout` pathless layouts, etc.) as allowed
exceptions.

**Route groups / folders:** lowercase kebab-case for the human-chosen part
of any route group (parenthesized folder, e.g. `(marketing)`) or pathless
layout folder name — consistent with the general file-naming rule above.
TanStack Router's own structural syntax (`$param`, `_layout`,
`(group)`, `__root.tsx`, `.` for flat nesting) are structural markers layered
on top of this, not a separate casing convention.

**Barrel files (`index.ts` re-exports):** allowed, but only at stable module
boundaries — e.g. an `index.ts` re-exporting a cohesive component folder's
public API — not scattered through frequently-changing internal code, and
never as a wildcard `export *` barrel (the worst case for bundle-size/
IDE-resolution cost).

## Reasoning

- The identifier and file-naming conventions above reflect uncontested 2026
  consensus across TypeScript/React sources — no genuine tradeoff to weigh.
- PascalCase enum members were chosen (over UPPER_SNAKE_CASE) to match
  typescript-eslint's own default recommendation and stay visually
  consistent with the enum name's own PascalCase.
- Barrel files are a live, unresolved debate in 2026: modern bundlers
  (Vite, which TanStack Start uses) lazily walk the module graph, softening
  the traditional bundle-size concern, but `export *` wildcard barrels
  remain a real cost regardless of bundler, and barrels scattered through
  fast-changing internal code create unnecessary indirection for readers.
  Restricting barrels to stable, cohesive module boundaries captures the
  ergonomic benefit (a clean import path for a module's public surface)
  without the downside.

## Sources

- [typescript-eslint.io/rules/naming-convention](https://typescript-eslint.io/rules/naming-convention/) —
  identifier casing conventions, `type`/`interface` treated identically for
  casing purposes.
- [github.com/typescript-eslint/typescript-eslint/issues/7879](https://github.com/typescript-eslint/typescript-eslint/issues/7879) —
  discussion of enum member casing defaults (PascalCase).
- [dev.to — kebab-case filenames and PascalCase classes](https://dev.to/adarshasnah/kebab-case-filenames-and-pascalcase-classes-naming-conventions-that-scale-7dp) —
  kebab-case filename rationale (cross-OS case-sensitivity, URL-friendliness).
- [biomejs.dev/linter/rules/use-filenaming-convention](https://biomejs.dev/linter/rules/use-filenaming-convention/) —
  Biome's file-naming lint rule and its TanStack-Router-compatible
  exceptions.
- [tanstack.com/router/latest/docs/routing/file-naming-conventions](https://tanstack.com/router/latest/docs/routing/file-naming-conventions),
  [tanstack.com/router/latest/docs/api/file-based-routing](https://tanstack.com/router/latest/docs/api/file-based-routing) —
  TanStack Router's structural filename markers (`$param`, `_layout`,
  `(group)`, `__root.tsx`).
- [tkdodo.eu/blog/please-stop-using-barrel-files](https://tkdodo.eu/blog/please-stop-using-barrel-files) —
  case against widespread barrel-file use.
