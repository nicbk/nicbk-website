# Reactive Sync Engine / Live-Update Layer

Researched: 2026-07-02. Decided: 2026-07-02.

## Decision

**Zero (Rocicorp)**, chosen over ElectricSQL (read-path only, would need a
separate write API), PowerSync (FSL-licensed service, conflicts with the
open-source-only constraint), and Triplit (now bound to Supabase's
roadmap). Zero's full read+write reactive sync with optimistic mutations
and fine-grained reactivity is the best fit for the site's "natively
reactive" requirement in
[DESIGN.md](../../high-level-guidance/design/DESIGN.md).

This pins the backend database to **Postgres** — see
[database.md](./database.md) (originally v15+, since revised to **v18+**
for a `data-modeling/`-specific requirement — see that doc for why).

Candidates evaluated against the project's constraints: fully open source,
and shared across all sub-applications
(see [DESIGN.md](../../high-level-guidance/design/DESIGN.md)).

## Options

**ElectricSQL**
- Syncs Postgres data to client-side SQLite using "Shapes" — declarative
  subscriptions defining what data a client needs.
- Read-path only: streams Postgres data to clients in real time; writes go
  through your own backend API (Electric doesn't handle the write path).
- License: Apache 2.0 / MIT. Fully open source.

**Zero (Rocicorp)**
- Client-side reactive cache that syncs with a server backend; built by the
  makers of Replicache.
- Optimistic mutations + fine-grained reactivity give the fastest perceived
  UI performance of the three.
- Requires Postgres v15+ with logical replication (`wal_level = logical`).
  `zero-cache` keeps a SQLite replica in sync via Postgres logical
  replication, and serves client queries from that replica.
- License: Apache 2.0 for client and server. Fully open source. Reached a
  stable 1.0 release (per InfoQ, June 2026).

**PowerSync**
- Full bidirectional sync: server DB → client SQLite (via Sync Rules and
  buckets), and client writes flow back through a persistent upload queue.
  Most mature/battle-tested option, esp. for mobile and full offline support.
- License: client SDKs are Apache 2.0, but the PowerSync Service itself is
  source-available under the **Functional Source License (FSL)** — not
  open source in the traditional sense. **This conflicts with the
  project's open-source-only constraint** unless the FSL is judged
  acceptable as an exception.

**Triplit**
- Was an independent open-source sync engine; **acquired by Supabase in
  October 2025**. Direction post-acquisition is toward open-sourcing
  further and expanding integrations, but the project is now bound to
  Supabase's roadmap rather than standing alone.

## Notes for later planning

- Both ElectricSQL and Zero converge on **Postgres** as the required
  backend database — this effectively pre-answers the separate "database"
  topic (see [database.md](./database.md)).
- PowerSync's FSL-licensed service is a licensing concern worth revisiting
  in [../licensing/index.md](../licensing/index.md).
- Zero handles both read and write sync paths; ElectricSQL only handles
  reads and expects an existing write-path API. This is a meaningful
  architectural difference to weigh in
  [../system-architecture/index.md](../system-architecture/index.md).

## Sources

- [ElectricSQL vs PowerSync vs Zero: Best Local-First Sync Engine (2026)](https://trybuildpilot.com/648-electric-sql-vs-powersync-vs-zero-2026)
- [Alternatives | Electric](https://electric-sql.com/docs/reference/alternatives)
- [ElectricSQL vs PowerSync vs Replicache - QueryPlane Blog](https://queryplane.com/blog/electricsql-vs-powersync-vs-replicache/)
- [Sync Engines Compared: ElectricSQL vs Convex vs Zero (2025)](https://merginit.com/blog/24082025-sync-engines-guide-electricsql-convex-zero)
- [Zero is Open Source Software](https://zero.rocicorp.dev/docs/open-source)
- [PowerSync Open-Source Packages](https://powersync.com/open-source)
- [Zero Reaches 1.0 - InfoQ](https://www.infoq.com/news/2026/06/zero-version-1/)
- [When To Use Zero](https://zero.rocicorp.dev/docs/when-to-use)
- [Connecting to Postgres - Zero Docs](https://zero.rocicorp.dev/docs/connecting-to-postgres)
- [Self-Hosting Zero](https://zero.rocicorp.dev/docs/deployment)
