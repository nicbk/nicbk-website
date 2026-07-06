# TypeScript Conventions

Researched: 2026-07-04. Decided: 2026-07-04.

Strictness settings, `type` vs. `interface`, avoiding `any`, and how types
are shared across the client/server boundary within this project's single
TanStack Start package (per
[../system-architecture/monorepo-structure.md](../system-architecture/monorepo-structure.md)).

## Decision

**Strictness (`tsconfig.json`):**

- `"strict": true` as the baseline (non-negotiable, universal default).
- Additionally enabled: `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`,
  `noPropertyAccessFromIndexSignature` — all low-friction, broadly
  recommended safety nets beyond base `strict`.
- **Not enabled: `exactOptionalPropertyTypes`.** The highest-friction of the
  commonly-suggested extra flags — it distinguishes a missing object key
  from a key explicitly set to `undefined`, which causes real friction with
  patterns like object-spread updates and some library/ORM calls that don't
  make that distinction. Not worth the friction for this project's scale.

**`type` vs. `interface`:** `interface` for object shapes and component
props (better extensibility via declaration merging, cleaner editor
tooltips at scale); `type` for unions, intersections, and mapped/utility
types. Functionally interchangeable in most cases — consistency in applying
this split matters more than the split itself.

**Avoiding `any`:** rely on `noImplicitAny` (part of `strict`) plus Biome's
`noExplicitAny` lint rule to catch both implicit and explicit `any`. When a
value's shape is genuinely unknown ahead of time, use `unknown` with type
narrowing instead of `any`. `any` is a last-resort escape hatch only, not a
sanctioned pattern.

**Sharing types across the client/server boundary:** handled via TanStack
Start's built-in Import Protection Vite plugin, which enforces the boundary
by file-suffix convention rather than a separate package:

- `*.server.*` files (e.g. `.server.ts`) — server-only implementation code,
  blocked from ever entering the client bundle.
- `*.client.*` files — client-only code, blocked from the server bundle.
- Plain files with **no suffix** — treated as shared, safe to import from
  both sides. This is where general app types/schemas/constants that both
  client and server code need should live.
- Type-only imports/re-exports are exempt from this enforcement entirely
  (erased at build time), so type definitions can freely cross the boundary
  regardless of file suffix.
- **Zero's `schema.ts` is still the shared client/server type source for
  data shapes** (article, annotation, citation-graph, `upload_jobs`, etc.),
  and query/mutator implementations stay shared between client and server,
  not duplicated — but as of
  [../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md),
  `schema.ts` itself is a **generated** artifact (via `drizzle-zero`), not
  hand-authored: the actual canonical source is the Drizzle schema used for
  Postgres migrations. This was revised from the original "Zero's schema.ts
  is hand-authored and canonical" framing once `database-migrations.md`'s
  research found Zero only supports generating `schema.ts` *from* an ORM
  schema (Drizzle/Prisma), never the reverse — so treating `schema.ts` as
  hand-authored would mean manually keeping it in sync with the real DDL,
  duplicating work the generator already does for free. A general no-suffix
  `types.ts`/`shared/` location still holds any additional app types not
  modeled in the schema (e.g. non-persisted UI-only types).

## Reasoning

- The extra strictness flags chosen are consistently described as low-cost,
  high-value additions beyond base `strict` (e.g.
  `noUncheckedIndexedAccess` is repeatedly cited as the single most valuable
  flag missing from base `strict`, catching silent `undefined` bugs from
  unchecked array/object index access). `exactOptionalPropertyTypes` was the
  one flag every source flagged as having real, not just theoretical,
  ergonomic cost — excluding it keeps the strictness gains without that
  friction.
- Using TanStack Start's own Import Protection mechanism (rather than
  inventing a separate types package or workspace boundary) is consistent
  with [monorepo-structure.md](../system-architecture/monorepo-structure.md)'s
  decision to stay in a single package — it gets client/server type-safety
  and boundary enforcement without any multi-package tooling.
- Treating the generated Zero schema as the shared data-shape source
  (rather than a separate hand-maintained types file) avoids duplicating
  type definitions the Drizzle-to-Zero generator already produces,
  consistent with AGENTS.md's "avoid duplication" principle.

## Sources

- [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/) —
  authoritative flag reference.
- [dev.to — 6 tsconfig options that actually matter](https://dev.to/jtorchia/typescript-strict-mode-the-6-tsconfig-options-that-actually-matter-in-production-and-when-to-446d) —
  beyond-strict flag recommendations and friction tradeoffs.
- [oneuptime.com — TypeScript strict mode guide (2026)](https://oneuptime.com/blog/post/2026-02-20-typescript-strict-mode-guide/view) —
  current strict-mode baseline consensus.
- [benmvp.com — TypeScript React props: interfaces vs. type aliases](https://www.benmvp.com/blog/typescript-react-props-interfaces-type-aliases/),
  [react-typescript-cheatsheet.netlify.app](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example/) —
  `type` vs. `interface` guidance.
- [biomejs.dev/linter/rules/no-explicit-any](https://biomejs.dev/linter/rules/no-explicit-any/) —
  Biome's explicit-`any` lint rule.
- [tanstack.com/start/latest/docs/framework/react/guide/import-protection](https://tanstack.com/start/latest/docs/framework/react/guide/import-protection),
  [infoq.com — TanStack Start Import Protection](https://www.infoq.com/news/2026/03/tanstack-import-protection/) —
  the `*.server.*`/`*.client.*`/no-suffix file convention and its type-only
  import exemption.
- [zero.rocicorp.dev/docs/schema](https://zero.rocicorp.dev/docs/schema),
  [zero.rocicorp.dev/docs/mutators](https://zero.rocicorp.dev/docs/mutators) —
  Zero's schema as the shared client/server type source, shared
  query/mutator implementations by design.
