# Research: System Architecture

Status: all decided (2026-07-04), 5/5 researched.

How the shared infrastructure and sub-applications fit together (service
boundaries, reactivity propagation, multi-app data sharing), per the
constraints in [DESIGN.md](../../high-level-guidance/design/DESIGN.md) and
building on the shared-infrastructure decisions in
[../technologies/index.md](../technologies/index.md) (Zero sync engine,
Postgres, Garage blob storage, Better Auth, TanStack Start, GROBID +
Semantic Scholar).

## Topics

- [service-topology.md](./service-topology.md) — Decided. Single-node
  topology throughout: TanStack Start app server (hosts Better Auth +
  Zero's query/mutate endpoints + job orchestration), zero-cache, Postgres,
  Garage, and a GROBID container all on one host; Semantic Scholar as an
  external API.
- [background-jobs.md](./background-jobs.md) — Decided. pg-boss
  (Postgres-native job queue), chained jobs one per stage
  (extract/enrich/finalize), non-fatal Semantic Scholar enrichment
  failures, and an app-owned `upload_jobs` table (not pg-boss's internal
  tables) as the thing Zero actually replicates for
  [../ui-ux/pages/lit-tracker/components/upload-status.md](../ui-ux/pages/lit-tracker/components/upload-status.md)'s
  job-list popup.
- [monorepo-structure.md](./monorepo-structure.md) — Decided. Single
  TanStack Start package, no multi-package workspace tooling — sub-apps
  separated via TanStack Router's route groups/pathless layouts, not
  package boundaries. Exact folder conventions deferred to
  `coding-conventions/`.
- [data-sharing-boundaries.md](./data-sharing-boundaries.md) — Decided.
  Multi-tenant: only Better Auth's `user`/`session`/`account`/
  `verification` tables are shared across sub-apps; everything else is
  sub-app-scoped then user-scoped via a `user_id` FK, enforced in the app
  server's `/query`/`/mutate` handlers (Zero has no RLS-style permissions
  layer).
- [reactivity-propagation.md](./reactivity-propagation.md) — Decided.
  Postgres → replication-manager → view-syncer → client over WebSocket,
  `useQuery` auto-re-renders, auth only at subscription time, and
  confirmed write-origin-agnostic (job-status writes propagate exactly
  like user mutations).
