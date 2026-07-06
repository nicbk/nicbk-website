# Zero Schema Conventions

Researched: 2026-07-05. Decided: 2026-07-05.

Cross-cutting conventions for any Zero-synced Postgres table, applying
project-wide — every other `data-modeling/` topic (article-core-schema,
tags-and-reading-status, citation-graph-schema, annotations-schema,
upload-jobs-schema) builds on these.

## Decision

### Schema declared once, in Drizzle — not decided here, just applied

This topic does **not** re-decide how the schema is declared/generated —
that's already settled in
[../technologies/orm.md](../technologies/orm.md) and
[../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md):
the Drizzle schema (`src/db/schema.ts`) is the canonical data-shape source,
and the official `drizzle-zero` generator produces `zero/schema.ts`
automatically from it. Every table this category defines (articles, tags,
`citation_edges`, annotations, `upload_jobs`) is written once as a Drizzle
table definition; nothing here should imply a hand-authored `zero/schema.ts`.

### ID strategy — client-generated UUIDv7

Every table's primary key is a client-generated UUIDv7, not an
auto-incrementing integer. Zero's own docs recommend client-generated
random IDs generally (`crypto.randomUUID()`/`uuid`/`ulid`/`nanoid`), since
optimistic creates need an ID before the round-trip to the server; an
auto-increment integer PK can't be produced client-side, which breaks
optimistic-create UX. Among random ID formats Zero itself has no
preference, but plain UUIDv4 is fully random and causes B-tree
page-split/fragmentation on insert-heavy tables — UUIDv7 keeps the same
optimistic-create property while inserting in roughly time-sorted order,
avoiding that fragmentation. Generated via the `uuid` npm package (v9+;
`crypto.randomUUID()` only produces v4).

**Exception: [upload-jobs-schema.md](./upload-jobs-schema.md)'s
`upload_jobs.id` is server-generated**, via Postgres 18's native
`uuidv7()` builtin rather than client code. That table is the one
exception to "every row starts as a client-side optimistic create" —
`upload_jobs` rows are only ever written by server-side job-handler code,
so the client-generated-ID rationale above doesn't apply, and Postgres's
own `uuidv7()` (extension-free as of v18) avoids adding app code solely
to generate an ID for an insert that's already entirely server-side.

### Timestamps — `timestamptz` in Postgres, `number()` (epoch-ms) in Zero

`created_at`/`updated_at` (and any other timestamp column) are Postgres
`timestamptz` columns — real, timezone-aware timestamps at the source of
truth. Zero's schema helpers have no native Date/timestamp type (only
`boolean()`/`number()`/`string()`/`json()`/`enumeration()`), and Rocicorp's
own reference schema (`hello-zero`) stores timestamps as `number()` (unix
epoch milliseconds). So every timestamp column is exposed through the
generated Zero schema as epoch-ms, consistently — the only requirement
called out for this topic (over the exact Postgres-side type) was that the
convention be applied the same way everywhere, which this satisfies.

### Delete semantics — hard delete

Deletes are real SQL `DELETE`s, not a soft-delete/tombstone flag. Zero's
own docs say nothing on this either way; soft-delete/tombstone patterns
found in general offline-first literature are aimed at peer-to-peer/
multi-writer systems resolving concurrent offline edit-vs-delete conflicts,
which doesn't describe this project's architecture — Postgres is the sole
source of truth, all writes go through server-side mutate handlers, and a
concurrent edit-vs-delete race just fails the edit handler (row not found)
rather than needing conflict resolution. Postgres `DELETE`s propagate to
clients through logical replication the same as any other row change (per
[../system-architecture/reactivity-propagation.md](../system-architecture/reactivity-propagation.md)).
Revisit only if an "undo delete" UX or audit trail is wanted later — nothing
currently specified (e.g.
[../ui-ux/pages/lit-tracker/components/article-edit.md](../ui-ux/pages/lit-tracker/components/article-edit.md)'s
delete confirmation) calls for one; that confirmation step is UX friction,
not an undo feature.

### Naming — snake_case in Postgres, camelCase in Zero, bridged by Drizzle's casing config

Postgres columns/tables are `snake_case` (Postgres's own idiomatic
default); the generated Zero schema's fields are `camelCase`. The bridge is
Drizzle's `casing: "snake_case"` option, set in **both** the runtime
`drizzle()` client config and `drizzle.config.ts` (used by `drizzle-kit
generate`) — the two must agree or the DB and the generated migrations can
drift apart. `drizzle-zero generate` then reads that same casing
convention through to `zero/schema.ts` automatically, so there is no
separate hand-written per-column `from()` mapping to maintain. Table/column
identifiers otherwise follow Zero's naming constraints
(`/^[A-Za-z_]+[A-Za-z0-9_-]*$/`), and `_0_version` is a reserved column
name to avoid.

### Foreign keys — `ON DELETE CASCADE` for ownership, `SET NULL` for soft references

Every FK falls into one of two categories, decided consistently across all
tables in this category rather than ad hoc per topic:

- **Ownership FKs** — the referencing row *belongs to* and has no meaning
  independent of the referenced row (every `user_id` FK to Better Auth's
  `user` table, a join-table row's FK to either side of the join, or an
  edge row's FK to the article it was extracted from). These get
  **`ON DELETE CASCADE`**: deleting the owner deletes the dependents. This
  is what makes account deletion
  ([../ui-ux/pages/site-wide/components/user-settings.md](../ui-ux/pages/site-wide/components/user-settings.md))
  actually remove a user's data, and matches the per-user data scoping
  already decided in
  [../system-architecture/data-sharing-boundaries.md](../system-architecture/data-sharing-boundaries.md).
- **Soft-reference FKs** — the referencing row remains meaningful even if
  the referenced row disappears; the FK is an optional "this happens to
  also match something" link, not ownership. These get **`ON DELETE SET
  NULL`** instead: deleting the referenced row reverts the FK to null
  rather than deleting the referencing row. The one instance so far is
  [citation-graph-schema.md](./citation-graph-schema.md)'s
  `citation_edges.cited_article_id` — deleting the cited article should
  revert that edge back to an unresolved placeholder, not silently destroy
  the citing article's bibliography entry. Choosing `CASCADE` here by
  default would be a real data-loss bug, so this distinction is called out
  explicitly rather than left to whichever action a table happens to reach
  for.

**Prefer a DB-level `CASCADE` over a Better Auth `databaseHooks.user.delete`
hook** for cleaning up a deleted user's data. Delete-hook support was only
recently added to Better Auth (a newer, less-hardened code path than
create/update hooks), and — independent of any specific known bug — a
Postgres FK cascade fires on *any* deletion of the `user` row regardless of
what triggered it, whereas an app-level hook only fires if Better Auth's
code path actually invokes it correctly. The DB-level mechanism doesn't
depend on hook-timing correctness at all.

**Cascade-triggered deletes replicate to Zero identically to direct
deletes.** Postgres's logical decoding operates on row-level heap changes,
not the SQL statement text that caused them, so a cascade-triggered
`DELETE` is indistinguishable at the WAL/decoding level from one issued
directly — it reaches `zero-cache` and connected clients the same way.
Every table here already satisfies Zero's `REPLICA IDENTITY` requirement
(default = primary key) via its UUID primary key, so no additional
replica-identity configuration is needed for this to work.

## Sources

- [zero.rocicorp.dev/docs/zero-schema](https://zero.rocicorp.dev/docs/zero-schema),
  [zero.rocicorp.dev/docs/schema](https://zero.rocicorp.dev/docs/schema) —
  schema field types (no native Date type), naming constraints, reserved
  `_0_version` column.
- [zero.rocicorp.dev/docs/postgres-support](https://zero.rocicorp.dev/docs/postgres-support) —
  confirms no documented soft-delete/cascade guidance, and the
  `REPLICA IDENTITY` (default = primary key) requirement every table here
  already satisfies.
- [github.com/better-auth/better-auth issue #4766](https://github.com/better-auth/better-auth/issues/4766) —
  delete-hook support (`databaseHooks.user.delete`) was only recently added
  to Better Auth, a newer/less-hardened path than create/update hooks —
  the reason a DB-level `CASCADE` is preferred over relying on it.
- [postgresql.org — Logical Decoding Concepts](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html) —
  confirms logical decoding operates on row-level changes, not statement
  text, so cascade-triggered deletes replicate identically to direct ones.
- [github.com/rocicorp/hello-zero](https://github.com/rocicorp/hello-zero) —
  reference schema confirming `number()`-as-epoch-ms timestamp convention
  and camelCase field naming.
- [zero.rocicorp.dev/docs/mutators](https://zero.rocicorp.dev/docs/mutators) —
  client-generated-ID rationale for optimistic mutations.
- [createuuid.com — UUID as a database primary key](https://createuuid.com/articles/uuid-as-database-primary-key),
  [leapcell.io — Choosing the Optimal UUID Type for Postgres PKs](https://leapcell.io/blog/choosing-the-optimal-uuid-type-for-postgresql-primary-keys) —
  UUIDv4 vs. UUIDv7 index-fragmentation reasoning.
- [marcobambini.substack.com — The Secret Life of a Local-First Value](https://marcobambini.substack.com/p/the-secret-life-of-a-local-first) —
  soft-delete/tombstone patterns in peer-to-peer/multi-writer local-first
  systems, and why that context doesn't match this project's centralized
  architecture.
- [orm.drizzle.team/docs/sql-schema-declaration](https://orm.drizzle.team/docs/sql-schema-declaration) —
  Drizzle's `casing: "snake_case"` option and the `snakeCase.table(...)`
  alternative.
- [github.com/rocicorp/drizzle-zero](https://github.com/rocicorp/drizzle-zero) —
  the official generator, its casing-inheritance behavior (already the
  basis of [../technologies/orm.md](../technologies/orm.md)'s decision, not
  re-derived here).
