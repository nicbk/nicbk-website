# Service Topology

Researched: 2026-07-04. Decided: 2026-07-04.

What distinct services exist and how they talk to each other — deployment/
process boundaries, not code organization (see
[monorepo-structure.md](./monorepo-structure.md) for that). Builds on the
shared-infrastructure decisions in
[../technologies/index.md](../technologies/index.md).

## Decision

All services run as sibling containers/processes on a single host/VM
(single-node throughout — appropriate for this project's personal-project
scale; each choice below can be split out to dedicated
hosts/multi-node later if load ever requires it, without changing the
higher-level topology):

- **TanStack Start app server** — serves the frontend, hosts
  [Better Auth](../technologies/auth.md)'s routes (mounted in-process as a
  catch-all route, e.g. `/api/auth/*` — not a separate service), implements
  Zero's `/query` and `/mutate` HTTP endpoints (business logic and auth
  checks live here, not inside Zero itself — Zero forwards the client's
  bearer token for this server to validate; Postgres access inside these
  handlers goes through Drizzle, see
  [../technologies/orm.md](../technologies/orm.md)), and orchestrates the
  GROBID/Semantic Scholar background job pipeline (see
  [background-jobs.md](./background-jobs.md)).
- **zero-cache** — a separate, always-on process (single-node mode, not
  split into replication-manager/view-syncer) that bridges Postgres logical
  replication to connected clients over WebSocket (default port 4848), and
  calls back into the app server's `/query`/`/mutate` endpoints for
  auth/business logic. See
  [reactivity-propagation.md](./reactivity-propagation.md) for the full
  data-flow path.
- **Postgres** — `wal_level=logical` enabled, required by Zero. See
  [../technologies/database.md](../technologies/database.md).
- **Garage** — single-node blob storage, standard S3-compatible API (no
  built-in redundancy in this mode; relies on the underlying filesystem).
  See [../technologies/blob-storage.md](../technologies/blob-storage.md).
- **GROBID** — a separate long-lived Docker container (same host as the app
  server) exposing a synchronous REST API (e.g.
  `POST /api/processFulltextDocument`) — no built-in job queue of its own,
  one blocking HTTP call per PDF. This is why the app needs its own async
  wrapper around it, see [background-jobs.md](./background-jobs.md). ~4GB
  RAM recommended for full-text extraction.
- **Semantic Scholar** — external API, no hosting needed.
- **GlitchTip** — self-hosted error tracker, added later for operational
  observability rather than as part of the application's own data flow;
  reuses this same Postgres instance (a separate database within it), no
  Redis needed. See
  [../devops-deployment/monitoring-and-observability.md](../devops-deployment/monitoring-and-observability.md).

## Reasoning

- **zero-cache: single-node.** Multi-node (separate replication-manager +
  view-syncer processes) exists for horizontal scale; this project's
  expected traffic doesn't warrant the added operational complexity.
- **Garage: single-node.** Garage's documented production recommendation is
  a 3-node replicated cluster, but single-node is explicitly supported and
  sufficient for a personal project; redundancy can be revisited if data
  durability becomes a concern later.
- **GROBID: same host as the app server.** Keeps the whole stack on one
  host/VM rather than provisioning a second host just to isolate GROBID's
  RAM footprint — simplest to run, consistent with the single-node choice
  made for the other services.

## Sources

- [zero.rocicorp.dev/docs/deployment](https://zero.rocicorp.dev/docs/deployment),
  [zero.rocicorp.dev/docs/zero-cache-config](https://zero.rocicorp.dev/docs/zero-cache-config) —
  zero-cache process model, single-node vs. multi-node, `/query`/`/mutate`
  callback endpoints.
- [grobid.readthedocs.io/en/latest/Grobid-service](https://grobid.readthedocs.io/en/latest/Grobid-service/),
  [Grobid-docker](https://grobid.readthedocs.io/en/latest/Grobid-docker/) —
  GROBID's synchronous REST API and Docker deployment model.
- [garagehq.deuxfleurs.fr/documentation/cookbook/real-world](https://garagehq.deuxfleurs.fr/documentation/cookbook/real-world/) —
  Garage single-node vs. 3-node cluster tradeoffs.
- [better-auth.com/docs/installation](https://better-auth.com/docs/installation) —
  Better Auth mounted as in-process routes, not a standalone service.
