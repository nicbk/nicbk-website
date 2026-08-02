# Task: Zero Sync Foundation

First of five. **Backend only — this task renders nothing.**

Stand up the Zero sync engine and the app server's authorization boundary for
synced data, and prove both against a real Postgres before any page depends on
them. When this task is done the site can sync user-scoped reactive data; it
just has nowhere to show it yet, which is task 2's job.

## What this task does

- **Adds `zero-cache` to `docker-compose.yml`** as a sibling of the existing
  `db`/`migrate`/`app` services on `app-internal`, pinned to a version tag,
  running in **single-node mode**. Configures its three Postgres connections —
  `ZERO_UPSTREAM_DB` (a direct connection; it owns the logical-replication
  slot), `ZERO_CVR_DB`, and `ZERO_CHANGE_DB` — as **separate databases inside
  the existing shared Postgres service**, plus a persisted volume for
  `ZERO_REPLICA_FILE` and an admin password. `wal_level=logical` is already set
  (#6 set it for exactly this moment).
- **Declares `articles` and `upload_jobs` in the Drizzle schema and migrates
  them**, exactly as specified in
  [article-core-schema.md](../../../../research/data-modeling/article-core-schema.md)
  and
  [upload-jobs-schema.md](../../../../research/data-modeling/upload-jobs-schema.md):
  the generated `authors_search` column and its `pg_trgm` GIN index, the
  `status` and `extraction_status` enums as text columns with defaults, the
  `ON DELETE CASCADE` ownership FKs, and `upload_jobs`' Postgres-native
  `uuidv7()` default. Additive only — expand phase.
- **Generates `zero/schema.ts` via `drizzle-zero`**, wired into `package.json`
  and guarded by a **CI drift check**, matching how `scripts/gen-auth-schema.mjs`
  already guards the Better Auth schema. Legacy CRUD mutators and queries stay
  **off**.
- **Excludes pg-boss's `pgboss` schema from the Postgres publication Zero
  replicates**, so a queue library's private, version-unstable tables are never
  synced to clients. Set now, before pg-boss actually arrives in task 4, because
  the publication is defined here.
- **Implements the app server's `/query` and `/mutate` endpoints.** `/query`
  resolves the Better Auth session into a **server-derived context**, looks up
  the named synced query, and returns ZQL scoped by that context's `user_id`.
  `/mutate` is stood up real and correctly authorized with an **empty mutator
  registry** — nothing in this feature writes from the browser (see
  [plan.md](../../plan.md)); #8 registers the first mutators.
- **Extends `src/env.ts` and `.env.example`** with the new required, server-only
  variables.

## Why it is first, and alone

`/query` is where **every authorization decision for user data on this site**
is made — Zero has no RLS-style layer behind it, so a mistake here is a
data-leak class of bug rather than a cosmetic one. It is also the largest and
most cross-cutting piece in the feature: a new always-on service, a replication
slot, a SQLite replica, generated schema, and two HTTP callbacks.

Isolating it in its own reviewable task, proven by integration tests against a
real Postgres, is the same shape that worked for
[`auth-backend-and-config`](../../../authentication/tasks/auth-backend-and-config/description.md)
— and for the same reason: prove the backend before any page depends on it.

## Not in this task

No UI at all. The `/lit-tracker` route, the header, the Zero client provider,
and the first `useQuery` are **task 2**, which follows immediately so the
reactivity built here becomes visible in a browser rather than only in tests.

`citation_edges` is **task 5** — nothing before the enrich stage needs it, and
adding it here would be a migration ahead of its consumer. Garage, pg-boss, and
GROBID are tasks 3–5. `tags`/`article_tags` belong to #8.
