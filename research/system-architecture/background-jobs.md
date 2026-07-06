# Background Job Pipeline

Researched: 2026-07-04. Decided: 2026-07-04.

How the PDF upload → GROBID extraction → Semantic Scholar enrichment
pipeline runs asynchronously, given GROBID itself is a synchronous-only
REST service (one blocking HTTP call per PDF, no built-in job queue — see
[service-topology.md](./service-topology.md)).

## Decision

- **Job queue library: pg-boss.** Postgres-native (no Redis or other new
  infrastructure beyond what's already decided), actively maintained,
  built on `SKIP LOCKED` + `LISTEN`/`NOTIFY`.
- **Pipeline shape: separate chained jobs, one per stage** (extract via
  GROBID → enrich via Semantic Scholar → finalize), using pg-boss's
  job-dependency/workflow orchestration, rather than one job with an
  internal `stage` field. Each stage gets independent retry/failure
  handling.
- **Semantic Scholar enrichment failures are non-fatal.** If enrichment
  fails/times out after retries, the article is still saved with
  GROBID-only data (marked as such); enrichment can be retried/backfilled
  later. Semantic Scholar is an external, rate-limited API outside our
  control, so a full upload failure over an enrichment hiccup would be
  unnecessarily punishing.
- **Reactive job status: an app-owned `upload_jobs` table, not pg-boss's
  internal tables.** pg-boss stores its own scheduling/locking/retry state
  in its own private Postgres schema (default `pgboss`, tables like `job`/
  `archive`/`schedule`) — this is treated as a private implementation
  detail of the queue library, not something Zero ever replicates (Zero's
  replication scope is controlled by the Postgres publication it reads
  from, so `pgboss.*` is simply excluded from that publication). Instead,
  our own job-handler code (invoked by pg-boss at each stage) writes/
  updates rows — via Drizzle, see
  [../technologies/orm.md](../technologies/orm.md) — in an app-owned
  `upload_jobs` table as it progresses; that table is what Zero replicates
  out to power
  [../ui-ux/pages/lit-tracker/components/upload-status.md](../ui-ux/pages/lit-tracker/components/upload-status.md)'s
  job-list popup. See
  [reactivity-propagation.md](./reactivity-propagation.md) for the general
  replication path this fits into.
- **Reliable enqueueing via pg-boss's transactional send.** pg-boss
  supports enqueueing a job inside the same Postgres transaction as the
  write that triggers it (e.g. the write that records a new upload), which
  is what actually provides outbox-pattern guarantees — if that transaction
  commits, the job is guaranteed to have been enqueued too, and vice versa.
  pg-boss ships a first-party Drizzle adapter (alongside Prisma/Kysely/Knex),
  so this composes directly with Drizzle as the ORM
  (see [../technologies/orm.md](../technologies/orm.md)) rather than needing
  a separate raw-client transaction handle. The `upload_jobs` table itself
  is not this mechanism; it's the reactive
  status projection that sits alongside it, not a replacement for it.

## Reasoning

- **pg-boss over graphile-worker.** Both are actively maintained,
  Postgres-only options. pg-boss was chosen for its more explicit
  multi-step job-dependency/chaining support and a JS-native API — a
  better fit than graphile-worker's more SQL-centric API for a Node/
  TanStack Start app.
- **Why pg-boss is more than "just a table would do":** a bare
  `upload_jobs` table has no execution engine (nothing to actually invoke
  the GROBID/Semantic Scholar handler code), no locking to stop two worker
  processes from double-processing the same upload, and no retry/backoff
  scheduling — all of which pg-boss provides (via `SKIP LOCKED` for
  exactly-once-ish delivery, and built-in exponential-backoff retries with
  dead-letter-queue redrive) rather than requiring us to hand-roll them.
- **Why a genuinely bad/corrupt PDF is handled differently from a
  transient failure:** pg-boss's retry/backoff is well-suited to transient
  GROBID/Semantic Scholar failures (timeouts, 5xx), but a permanently
  malformed PDF is not a retry candidate — the GROBID-stage handler must
  catch that case explicitly and write a terminal `failed` status with a
  reason string to `upload_jobs`, rather than retrying forever.

## Sources

- [github.com/timgit/pg-boss](https://github.com/timgit/pg-boss),
  [timgit.github.io/pg-boss](https://timgit.github.io/pg-boss/) — pg-boss's
  transactional enqueue support (with ORM adapters for Prisma/Kysely/Knex/
  Drizzle), polling + `LISTEN`/`NOTIFY` delivery, `SKIP LOCKED`-based
  exactly-once delivery, retries/backoff/dead-letter queues, cron
  scheduling, and job-dependency workflow orchestration.
- [agledger.ai/blog/pg-boss-production-lessons](https://agledger.ai/blog/pg-boss-production-lessons/) —
  documents pg-boss's internal `pgboss` schema/tables as unstable across
  versions (e.g. v11 removed the `archive` table), confirming it should
  never be queried/synced directly — wrap it behind app-owned tables
  instead.
- [zero.rocicorp.dev/docs/mutators](https://zero.rocicorp.dev/docs/mutators) —
  Zero's own documented "transactional outbox" pattern for async work
  (write to an app-owned table, a background worker processes it, results
  land back in Postgres via normal writes that Zero replicates).
- [zero.rocicorp.dev/docs/zero-schema](https://zero.rocicorp.dev/docs/zero-schema) —
  confirms Zero's replication scope is controlled via the Postgres
  publication, not by what's declared in Zero's own schema file, so
  `pgboss.*` can be excluded from replication entirely.
