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

**Type-only imports: separated style**
(`import type { Foo } from './foo'` as its own statement), not the inline
`import { type Foo, bar }` form. Enforced via Biome's `useImportType` rule
configured to its `separatedType` style option. This supersedes the original
inline-style decision — see the 2026-08-01 revision below for why the choice
turned out not to be cosmetic.

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
- ~~Inline `import { type Foo, bar }` reduces total import-statement count
  per file (relevant since this project already tends to import several
  colocated siblings per component) without losing the explicitness
  benefit of `import type` — the type-only distinction Biome's
  `useImportType` rule is enforcing is preserved either way, this is purely
  a formatting choice between the two supported styles.~~ **Superseded
  2026-08-01** — the final clause is false under `verbatimModuleSyntax`; see
  the revision below. The statement-count saving was real but small, and it
  was bought with a silent bundling hazard.

## Revision (2026-08-01): inline type imports are not purely cosmetic

The reasoning above says the inline-vs-separated choice "is purely a
formatting choice between the two supported styles". That turns out to be
wrong in one specific and consequential case, found while building the
user-settings modal.

With `verbatimModuleSyntax` (which `tsconfig.json` sets), TypeScript compiles

```ts
import { type Auth } from './create-auth'
```

to `import {} from './create-auth'` — a **side-effect import**, kept in the
emitted module. `import type { Auth } from './create-auth'` is erased outright.
So for a module that is reachable from the client, the two styles differ in
what ends up in the browser bundle, not just in how the source reads.

The concrete failure: `src/auth/session.ts` names the server-only `Auth` type.
Once a route imported the guard that leads to it (the guard's first live
consumer, `/user-settings-probe`), the surviving side-effect import pulled
Better Auth, Drizzle, and Postgres' driver into the client bundle. Hydration
then died on `ReferenceError: Buffer is not defined` — and because that kills
hydration for the whole app, *every* page silently stopped responding to
clicks, with only a console error to show for it.

**Resolved (2026-08-01): switched to `separatedType` project-wide.** The
initial fix was a documented `biome-ignore` at the one boundary that had bitten
(`src/auth/session.ts`), deferring the wider question. Settled with the user
before feature #7, and settled in favour of changing the rule:

- The exception-per-boundary approach requires the author to *first recognize*
  that a module is client-reachable and names a server-only type. That
  recognition is exactly what failed here — and #7 multiplies the opportunities,
  since every protected route it adds reaches the guard.
- The failure is silent and disproportionate. Nothing throws at build time; the
  bundle simply grows a side-effect import, and hydration dies at runtime on the
  *whole app*, not just the offending page. Lint, typecheck, unit, integration,
  and e2e all passed with it broken — only opening the site in a browser caught
  it.
- `separatedType` makes the erasure-safe form the default everywhere, so no
  judgement call is required at the point of writing an import. The cost is one
  extra statement in files that import both a type and a value from the same
  module — a real but minor readability cost, and the one the original decision
  was optimizing away.
- The migration was mechanical: `biome check --write` rewrote 33 imports across
  28 files, and Biome then flagged the `biome-ignore` in `session.ts` as
  redundant, which is how the exception came out.

The remaining risk is not eliminated, only made much less likely: a value
import of a server-only module still leaks, and no lint rule catches that.
What guards it is the server/client boundary discipline in
[../system-architecture/index.md](../system-architecture/index.md), plus
verifying real pages in a browser.

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
  Biome's `useImportType` rule and its `inlineType` / `separatedType` style options.
