# Database Migrations

Researched: 2026-07-05. Decided: 2026-07-05.

How Postgres schema changes are deployed/sequenced relative to app deploys
— given Zero (the sync engine already decided in
[../technologies/sync-engine.md](../technologies/sync-engine.md)) doesn't
manage Postgres DDL itself, and the pull-based continuous deployment model
already decided in [deployment-strategy.md](./deployment-strategy.md).
Schema *design* itself (what tables/columns exist) stays out of scope here,
deferred to [../data-modeling/index.md](../data-modeling/index.md) — this
doc owns the migration *mechanism and sequencing*, not the shape of the
data. Guiding principles from [index.md](./index.md) apply here as
everywhere in this category: prefer open-source tooling, minimize manual
configuration.

## Decision

### Zero's `schema.ts` is not a migration tool — Drizzle owns actual Postgres DDL

Zero does not create or alter Postgres tables; `zero/schema.ts` is a
client/server-visible projection layer (which tables/columns get synced,
consumed at the type layer per
[../coding-conventions/typescript-conventions.md](../coding-conventions/typescript-conventions.md)),
entirely separate from the actual DDL. Zero's own docs describe `schema.ts`
as "usually generated from your backend schema," via one of two officially
Rocicorp-maintained generators: `drizzle-zero` or `prisma-zero` — generation
only runs ORM-schema-to-Zero-schema, never the reverse.

**Drizzle + Drizzle Kit is the migration tool** for actual Postgres DDL,
paired with the official `drizzle-zero` generator to produce `zero/schema.ts`
automatically from the Drizzle schema on every change. This makes the
**Drizzle schema the canonical data-shape source**, not `schema.ts` itself —
a deliberate revision of `typescript-conventions.md`'s original framing (see
that doc's updated wording), made once this research found no tooling path
to keep a hand-authored `schema.ts` in sync with real DDL without either
duplicating effort or losing the generator's zero-manual-sync benefit.
Chosen over Prisma Migrate (an equally Zero-supported option — as of Prisma
7 it dropped its separate Rust query-engine binary, so the old
slim-Docker-image objection no longer applies, but it still requires its
own `.prisma` schema DSL and generate step, one more moving part than
Drizzle's code-first TypeScript schema), Atlas (powerful, but a separate Go
binary outside the npm/TypeScript toolchain — added operational surface
for no benefit Drizzle doesn't already cover here), and node-pg-migrate/
Umzug/hand-written SQL (viable, but none has an official Zero-schema
generator, which would reintroduce exactly the manual-sync problem this
choice avoids).

The old `zero-deploy-permissions` CLI step (pushing an RLS-style permissions
block from `schema.ts` to a running `zero-cache`) is deprecated — it
belonged to Zero's legacy permissions model, superseded by the
custom-mutators/synced-queries architecture already decided in
[../system-architecture/service-topology.md](../system-architecture/service-topology.md),
where auth/business-logic checks live entirely in the app server's own
query/mutate endpoint code. **No separate "deploy schema/permissions to
zero-cache" step exists or is needed** — `zero-cache` introspects Postgres
directly via logical replication; `schema.ts` is consumed only at the
TypeScript type layer, by the client bundle and the app server's endpoint
code.

### Migration sequencing: Compose's native `pre_start`/init mechanism

Migrations run as a declared init step in `docker-compose.yml` itself
(Compose's `pre_start` mechanism, Compose 5.3+) — the migration command runs
to completion before the app server's own service container starts, as
part of the same `docker compose up -d` the deploy script already runs, with
no additional custom scripting in the systemd-timer deploy script beyond
what `deployment-strategy.md` already decided. Chosen over an explicit
`docker compose run --rm <service> <migrate-command>` line inserted
separately into the deploy script — the native mechanism gets the same
before-the-service-starts guarantee without adding custom logic outside the
compose file, matching this category's minimize-manual-config principle.

This still matters despite being single-instance throughout (no rolling/
multiple replicas): Postgres logical replication does not replicate DDL —
schema changes happen out-of-band from `zero-cache`'s subscription. Zero
uses Postgres event triggers, where available, to detect and handle schema
changes gracefully; where they're unavailable (some restricted managed
Postgres providers), Zero's documented fallback is a full reset of all
server- and client-side state on any detected schema change. This project's
Postgres is self-hosted with full superuser access, so Zero should be able
to create its own event triggers and avoid that fallback — but Zero's docs
give no blanket guarantee for generic self-hosted setups, so this should be
verified empirically at implementation time (check `zero-cache`'s logs on
first connect for event-trigger creation), not assumed.

### Expand/contract discipline, mandatory given the rollback model

Because [deployment-strategy.md](./deployment-strategy.md)'s rollback model
is "revert the commit on `main`, let the pull-based mechanism redeploy" —
which reverts application *code*, not the database *schema* — any migration
that already ran forward must remain tolerable to the old (reverted) code.
This makes expand/contract migrations effectively mandatory, not just good
practice: add nullable/new columns and backfill in one migration; only
tighten constraints or drop/rename in a later, separate migration once
nothing depends on the old shape.

Zero's own deployment docs independently state the same discipline for its
own reasons — expanding changes deploy DB → API → Client, contracting
changes deploy in the reverse order, and Zero explicitly recommends
**separating expanding and contracting changes into different PRs and
deployments**. Zero adds a real extra risk beyond a plain non-replicated
Postgres app: since any detected schema change can trigger the full-reset
fallback described above if event triggers aren't active, a contracting
migration (a drop/rename) has a larger blast radius here than the
equivalent change would have without Zero in the picture — every connected
client potentially resyncs, not just a cache invalidation. Contract
migrations should be treated as their own deliberate, separately-reviewed
deploy, not a routine no-op cleanup step.

The generated `zero/schema.ts` must be regenerated (via `drizzle-zero`) and
follow this same DB → API → Client / Client → API → DB ordering as part of
each migration PR, since it's consumed at both the server and client type
layers — an out-of-step generated schema is its own way to silently break
the expand/contract discipline.

## Reasoning

- Drizzle was chosen over Prisma primarily on tooling-footprint grounds
  (code-first TypeScript schema, no separate DSL/generate step) now that
  Prisma 7's removal of its Rust engine neutralized the one clear objection
  that used to favor Drizzle more strongly — this was a closer call than
  the Atlas/node-pg-migrate rejections, which failed more directly on
  "official Zero-schema generator exists or it doesn't."
- Revising `typescript-conventions.md`'s "Zero's schema.ts is canonical"
  framing, rather than working around it, follows this project's established
  pattern of updating an already-decided document when new research
  produces information that directly contradicts it (see
  `ci-pipeline.md`'s network-isolation revision for precedent) — treating
  the original framing as stale rather than binding once the actual Zero/
  Drizzle generation direction was confirmed.
- Compose's native `pre_start` mechanism was preferred over custom
  deploy-script logic for the same reason a systemd timer (not a bespoke
  polling script) was preferred in `deployment-strategy.md`: reaching for a
  built-in mechanism over hand-rolled logic wherever one exists and fits,
  consistent with this category's minimize-manual-config principle.
- Expand/contract wasn't really a choice to make so much as a consequence
  already implied by the rollback model decided in `deployment-strategy.md`
  — this doc mainly makes that implication explicit and adds the
  Zero-specific amplification (full-reset blast radius) on top of the
  standard reasoning.

## Sources

- [zero.rocicorp.dev/docs/schema](https://zero.rocicorp.dev/docs/schema),
  [zero.rocicorp.dev/docs/zero-schema](https://zero.rocicorp.dev/docs/zero-schema) —
  `schema.ts` as a generated projection layer, not a migration tool.
- [github.com/rocicorp/drizzle-zero](https://github.com/rocicorp/drizzle-zero),
  [github.com/rocicorp/prisma-zero](https://github.com/rocicorp/prisma-zero) —
  the two officially-maintained ORM-schema-to-Zero-schema generators.
- [zero.rocicorp.dev/docs/deprecated/rls-permissions](https://zero.rocicorp.dev/docs/deprecated/rls-permissions) —
  the deprecated `zero-deploy-permissions` CLI/RLS-style permissions model.
- [zero.rocicorp.dev/docs/permissions](https://zero.rocicorp.dev/docs/permissions),
  [zero.rocicorp.dev/docs/custom-mutators](https://zero.rocicorp.dev/docs/custom-mutators),
  [zero.rocicorp.dev/docs/synced-queries](https://zero.rocicorp.dev/docs/synced-queries) —
  the custom-mutators/synced-queries model replacing RLS-style permissions.
- [zero.rocicorp.dev/docs/add-to-existing-project](https://zero.rocicorp.dev/docs/add-to-existing-project) —
  confirms `zero-cache` introspects Postgres directly, no schema-push step.
- [orm.drizzle.team/docs/drizzle-kit-generate](https://orm.drizzle.team/docs/drizzle-kit-generate),
  [orm.drizzle.team/docs/migrations](https://orm.drizzle.team/docs/migrations) —
  Drizzle Kit's migration generation/application workflow.
- [prisma.io/blog — from Rust to TypeScript](https://www.prisma.io/blog/from-rust-to-typescript-a-new-chapter-for-prisma-orm) —
  Prisma 7 (Nov 2025) dropping its Rust query engine.
- [atlasgo.io](https://atlasgo.io/) — Atlas's declarative schema-diff
  approach and external-ORM-schema support, considered and set aside.
- [npm-compare.com — db-migrate vs. migrate vs. node-pg-migrate vs. Umzug](https://npm-compare.com/db-migrate,migrate,node-pg-migrate,umzug) —
  comparison of generic/Postgres-specific migration runners.
- [pythonspeed.com — decoupling database migrations from server startup](https://pythonspeed.com/articles/schema-migrations-server-startup/) —
  running migrations as a distinct pre-start step rather than baked into
  app startup, and expand/contract guidance.
- [ooo.run — Docker Compose init containers](https://ooo.run/en/post/docker-compose-init-containers.html) —
  Compose's native `pre_start` init-step mechanism (Compose 5.3+).
- [postgresql.org — logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html),
  [wiki.postgresql.org — logical replication of DDLs](https://wiki.postgresql.org/wiki/Logical_replication_of_DDLs) —
  confirms DDL isn't replicated by Postgres logical replication itself.
- [zero.rocicorp.dev/docs/connecting-to-postgres](https://zero.rocicorp.dev/docs/connecting-to-postgres) —
  Zero's event-trigger schema-change detection and the full-reset fallback
  for providers without event-trigger support.
- [zero.rocicorp.dev/docs/deployment](https://zero.rocicorp.dev/docs/deployment) —
  Zero's own expand/contract deployment ordering guidance and the
  recommendation to separate expanding/contracting changes into different
  PRs and deployments.
