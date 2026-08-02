# Status: Zero Sync Foundation

**State:** Not started. First of five.

- Branch: `article-upload-and-extraction/zero-sync-foundation` (to be created).
- Sub-issue: [#67](https://github.com/nicbk/nicbk-website/issues/67)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)),
  unassigned — self-assign before starting.
- PR: —

## Notes carried into implementation

- **`/query` is the authorization boundary.** Zero has no permissions layer
  behind it. Scope by the `user_id` of a **server-derived context**, never from
  client arguments, and prove it non-vacuously with a second user's rows
  present.
- **Use Zero's current model, not the legacy one.** Synced queries + custom
  mutators; leave `ZERO_ENABLE_CRUD_MUTATIONS` false and do not pass
  `drizzle-zero`'s `--enable-legacy-mutators` / `--enable-legacy-queries`.
- **Three Postgres connections plus a replica volume**: `ZERO_UPSTREAM_DB`
  (direct, not pooled — it owns the replication slot), `ZERO_CVR_DB`,
  `ZERO_CHANGE_DB`, `ZERO_REPLICA_FILE`, `ZERO_ADMIN_PASSWORD`. Separate
  databases in the **existing** Postgres service, not a second service.
- **Exclude `pgboss` from the publication now**, while the publication is being
  defined, even though pg-boss does not arrive until task 4.
- **`zero/schema.ts` is generated with a CI drift check** — follow
  `scripts/gen-auth-schema.mjs`'s precedent rather than inventing a second
  pattern.
- **Follow the schema docs literally.** `article-core-schema.md` and
  `upload-jobs-schema.md` specify these tables column by column, including the
  pre-allocated-ID design where `upload_jobs.id` is the future article's ID.
  Deviating means re-deciding with the user, not improvising.
- **Separated type imports.** Everything here is server-only; a stray inline
  type import is how server modules reached the client bundle in #6.
- Re-verify current APIs before writing code (research-over-recall): Zero
  1.8.0, `drizzle-zero` 0.20.0. Both moved since the July research.

## Log

- 2026-08-01 — Task defined during the feature spec. First of five; not yet
  started.
