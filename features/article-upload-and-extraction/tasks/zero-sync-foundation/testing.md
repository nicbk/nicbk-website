# Testing: Zero Sync Foundation

What this task's tests must cover. Tiers and tooling are the feature's
([../../testing.md](../../testing.md)); this task adds no new tier.

Because this task has no UI, its weight sits in **integration**. That is the
point, not a gap: the thing being proven is a data-isolation property, and only
a real database with two users' rows in it can prove it.

## Unit (Vitest)

- **Env schema:** each new Zero variable fails `parseEnv` with a clear,
  per-variable error when missing or malformed, and parses when present. No new
  variable is `VITE_`-prefixed. (Extends the existing `src/env.test.ts`
  pattern.)
- **Context derivation** (pure): given a resolved Better Auth session, the
  synced-query context carries that session's `user_id`; given no session, it
  produces the unauthenticated context. Client-supplied arguments cannot
  influence the `user_id` the context carries — asserted directly, since this is
  the property everything else rests on.
- **Synced query definitions** (pure, where they can be evaluated without a
  server): each named query builds ZQL filtered by the context's `user_id`.

## Integration (Vitest + Testcontainers Postgres)

- **Migrations** apply cleanly to a fresh database and produce `articles` and
  `upload_jobs` with the expected columns, defaults, and indexes — including
  the `pg_trgm` extension, the `authors_search` GIN index, and
  `upload_jobs.id`'s `uuidv7()` default.
- **`authors_search` is actually generated:** inserting an article with an
  `authors` jsonb array yields a lowercased `authors_search` value containing
  each author's `name`, without the application writing that column.
- **Cross-user isolation — the load-bearing test.** With rows present for two
  distinct users, a `/query` request carrying user A's session returns only A's
  rows; the same request carrying no session returns nothing; and a request that
  names user B's `user_id` or a specific row ID of B's **still** returns
  nothing. This must be **non-vacuous**: B's rows must genuinely exist, so a
  handler that returned nothing at all would fail. Verify non-vacuity the way
  #6's hardening test was verified — by confirming a deliberately broken scoping
  rule fails the test.
- **Cascade:** deleting a `user` row removes that user's `articles` and
  `upload_jobs`. This is the first real coverage of the cascade convention #6
  could only describe.
- **`upload_jobs.article_id` cascade:** deleting an article removes its job row.
- **`/mutate` is authorized even while empty:** an unauthenticated request is
  refused rather than silently accepted, so the endpoint is not a hole waiting
  for #8 to fill it.

## Schema drift

- The `zero/schema.ts` drift check fails CI when the Drizzle schema changes
  without regeneration — verified the same way the Better Auth schema check
  was: by making a schema change and confirming the check catches it.

## Stack verification (manual, recorded in status.md)

Not automated, but required before the PR — this is the equivalent of the
Compose walkthrough
[`auth-backend-and-config`](../../../authentication/tasks/auth-backend-and-config/status.md)
recorded:

- `docker compose -f docker-compose.yml up -d` brings up `db` → `migrate` →
  `app` **and** `zero-cache`, with zero-cache healthy and holding a replication
  slot (`select * from pg_replication_slots` shows it).
- A row inserted directly into Postgres appears in zero-cache's replica.
- The stack comes up the same way under plain `docker compose up` (dev
  override).

## Not covered here

No e2e and no accessibility tests — there is nothing to render. Both arrive in
task 2, which is deliberately the very next task so this task's work does not
stay unexercised in a browser for long.
