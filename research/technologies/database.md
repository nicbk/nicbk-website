# Backend Database

Researched: 2026-07-02. Decided: 2026-07-02.

Settled by the sync-engine choice — see [sync-engine.md](./sync-engine.md).

## Decision

**PostgreSQL** (**v18+**, with logical replication / `wal_level = logical`
enabled), required by Zero, the chosen sync engine. One Postgres
instance/cluster backs all sub-applications, satisfying the "shared
infrastructure" constraint in
[DESIGN.md](../../high-level-guidance/design/DESIGN.md).

**Revised 2026-07-05** from the original v15+ floor: Zero's own docs state
that `generated ... stored` columns only replicate to the client on
Postgres 18+ (lower versions silently don't sync them). This project's
[../data-modeling/article-core-schema.md](../data-modeling/article-core-schema.md)
needs a DB-generated `authors_search` column for indexed author search, so
the minimum version is bumped to 18+ project-wide rather than working
around the limitation with an app-maintained column.

No dedicated additional research was needed beyond confirming this
convergence; open questions about schema organization across sub-apps
belong in [../data-modeling/index.md](../data-modeling/index.md).

## Sources

See [sync-engine.md](./sync-engine.md) sources.
