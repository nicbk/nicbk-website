# Reactivity Propagation

Researched: 2026-07-04. Decided: 2026-07-04.

How Zero's sync flows from a Postgres write to all connected clients, and
how that same mechanism carries background-job status updates (see
[background-jobs.md](./background-jobs.md)) so upload/extraction progress
is live-updating too, not just user-authored data.

## Decision

Recording the confirmed propagation path as the architecture (no branching
choice here — this topic is the mechanics that make the other four
system-architecture decisions work together):

- **Postgres → zero-cache.** A `replication-manager` process owns the
  Postgres logical replication slot (`wal_level=logical`, per
  [service-topology.md](./service-topology.md)) and maintains a primary
  SQLite replica. One or more `view-syncer` processes (in this project's
  single-node setup, effectively the one zero-cache process) subscribe to
  the replication-manager's change stream, keeping their own SQLite copies
  in sync via incremental view maintenance (hydrate a query once, then
  push incremental diffs as matching rows change).
- **zero-cache → client.** Clients connect to a view-syncer over WebSocket
  and receive live diffs for their subscribed queries.
- **Client subscription.** A `useQuery` hook (`@rocicorp/zero/react`) takes
  a ZQL query; the component just re-renders automatically as diffs
  arrive — no manual subscription/unsubscription code needed.
- **Authorization timing.** The app server's `/query` endpoint (see
  [data-sharing-boundaries.md](./data-sharing-boundaries.md)) is only
  called once, at subscription time, not on every subsequent update — after
  that, diffs flow straight through the already-authorized subscription,
  riding on logical replication rather than polling. Propagation is
  effectively near-real-time.
- **Write-origin agnosticism, confirmed.** Zero's replication watches
  Postgres itself (via logical replication/event triggers), not the write
  path that produced a change — a pg-boss job handler updating
  `upload_jobs` propagates to clients exactly the same way a user-initiated
  `/mutate` call does. This is what makes
  [background-jobs.md](./background-jobs.md)'s job-status table live-update
  the UI's job-list popup with no special-case plumbing.
- **High-frequency same-row updates: not a concern for this project's
  design.** Zero's docs don't explicitly address whether very frequent
  updates to the same row (e.g. per-byte progress) are efficient or
  discouraged — genuinely unconfirmed. This is moot here because
  [background-jobs.md](./background-jobs.md) already writes only discrete
  stage transitions (extract → enrich → finalize) to `upload_jobs`, not
  fine-grained progress, so this design is already on the safe side of
  that open question. Revisit with targeted verification if job status
  ever needs finer-than-stage-level granularity.

## Sources

- [zero.rocicorp.dev/docs/deployment](https://zero.rocicorp.dev/docs/deployment) —
  replication-manager/view-syncer split, `ZERO_CHANGE_STREAMER_URI`,
  authorization only at subscription inception (`ZERO_QUERY_URL` called
  once per (re)subscription, not per update).
- [zero.rocicorp.dev/docs/debug/replication](https://zero.rocicorp.dev/docs/debug/replication) —
  incremental view maintenance (hydrate once, then incremental diffs).
- [zero.rocicorp.dev/docs/react](https://zero.rocicorp.dev/docs/react),
  [zero.rocicorp.dev/docs/reading-data](https://zero.rocicorp.dev/docs/reading-data) —
  `useQuery` React hook, auto-re-render on diffs.
- [zero.rocicorp.dev/docs/mutators](https://zero.rocicorp.dev/docs/mutators),
  [zero.rocicorp.dev/docs/connecting-to-postgres](https://zero.rocicorp.dev/docs/connecting-to-postgres) —
  confirms sync is write-origin-agnostic: "changes to the database are
  replicated to zero-cache as normal... whether through Zero's mutators or
  other code."
