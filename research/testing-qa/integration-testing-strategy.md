# Integration Testing Strategy

Researched: 2026-07-05. Decided: 2026-07-05.

What layer(s) of testing stand up real infrastructure (Postgres, Zero,
Garage) vs. mock/fake it, for the stack decided in
[../system-architecture/service-topology.md](../system-architecture/service-topology.md).
Sits between [test-runner-and-frameworks.md](./test-runner-and-frameworks.md)
(isolated unit/component logic, no real infrastructure) and
[e2e-testing.md](./e2e-testing.md) (full docker-compose stack, mocked
external services only). Runs inside the self-hosted, Sysbox-isolated,
ephemeral CI runner decided in
[../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md).

## Decision

### Postgres: Testcontainers, one instance per test run

**Testcontainers** (`@testcontainers/postgresql` for Node) spins up an
ephemeral, real Postgres instance per CI run. This is not in tension with
the CI runner's Docker-socket isolation decided in `ci-pipeline.md`: Sysbox
gives the runner container its own isolated internal Docker daemon
specifically so Docker-in-Docker works without exposing the host's
socket — Testcontainers running inside that runner talks to the runner's
own internal daemon, which is exactly the scenario Sysbox exists to
support, not a workaround around it. Docker's own official GHA runner
image (already this project's CI choice) is built on Sysbox specifically
for this reason.

### Drizzle: real migrations once, transaction-rollback per test

Drizzle's actual migration files (the canonical DDL source, per
[../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md))
run once against the Testcontainers Postgres instance at suite start. Each
individual test then runs inside a transaction that's rolled back at
teardown, rather than a full reset/reseed between tests — fast per-test
isolation without repeated migration/seed overhead.

### Zero: handlers + Postgres only, not a running `zero-cache`

Integration tests exercise the app server's `/query`/`/mutate` handlers
directly against the Testcontainers Postgres — this is where the actual
business logic (auth checks, Drizzle reads/writes) lives, per
`service-topology.md`. No real `zero-cache` process is stood up at this
layer. Verifying actual live reactive sync (a connected client receiving a
pushed update over WebSocket) is left entirely to
[e2e-testing.md](./e2e-testing.md)'s Playwright tests against the full
docker-compose stack, which already need the whole stack running anyway.

**This split is an inference from Zero's documented architecture, not an
official Rocicorp recommendation** — Rocicorp has no official
integration-testing guidance for `zero-cache` at all as of this research
(a real ecosystem-immaturity gap for a still-niche tool, not a settled
practice this project is deviating from). The decision was made explicitly
rather than assumed, given that gap.

### Garage: the real `dxflrs/garage` image, not a MinIO test double

Integration tests run against a real Garage container rather than
introducing MinIO (or another general S3-mocking tool) as a second
S3-compatible service just for testing. Garage's official image is small
(~50MB RAM, single Rust binary, SQLite-backed metadata) — cheap enough to
run directly, avoiding the maintenance/consistency cost of testing against
a *different* S3-compatible implementation than the one actually used in
production. A small one-time setup script (layout → bucket → key) is
needed for a fresh single-node Garage instance, noted by at least one
source as mildly annoying for dev/test use, but not prohibitive.

## Reasoning

- Testcontainers-vs-service-container and the Sysbox compatibility
  question were both directly verified rather than assumed — the
  plausible-sounding "Testcontainers needs the Docker socket, which
  ci-pipeline.md deliberately keeps away from the runner" concern turned
  out to be a non-issue once Sysbox's actual purpose (isolated *internal*
  Docker daemon, not host-socket passthrough) was confirmed.
- Transaction-rollback-per-test was chosen over a full reset/reseed cycle
  purely for speed — it's the current standard pattern for Postgres
  integration testing generally, not something specific to this project's
  stack.
- The Zero tier split (handlers+Postgres for integration, full stack for
  e2e) was decided deliberately, not treated as obviously correct, because
  no external source validates it as "the" right boundary for a
  Zero-based app — it was presented to the user as an inference from
  Zero's architecture (business logic lives in the handlers,
  `zero-cache` is purely a replication/broadcast layer) precisely because
  the research found a genuine gap here rather than a settled consensus,
  consistent with AGENTS.md's research-over-recall principle not
  extending to inventing false confidence where the field itself hasn't
  settled something.
- Garage-over-MinIO avoids maintaining two different S3-compatible
  implementations (one for prod, one for tests) when the real one is
  cheap enough to just run — a direct application of this project's
  general avoid-duplication/minimal-surface principle, not unique
  reasoning invented for this topic.

## Sources

- Testcontainers' official Node.js Postgres module docs and community
  guidance on ephemeral per-run Postgres in CI.
- Docker's official `github-actions-runner` image and Sysbox's own
  documentation, confirming isolated internal-daemon Docker-in-Docker
  rather than host-socket exposure — resolving the CI-isolation question
  against `ci-pipeline.md`'s existing no-Docker-socket-mount decision.
- Zero's (Rocicorp) own architecture documentation on
  `handleMutateRequest`/`handleQueryRequest` and `mustGetMutator`/
  `mustGetQuery`, showing business logic lives in the app server's
  handlers rather than inside `zero-cache` itself — no official
  integration-testing guidance found beyond this architectural framing.
- Drizzle-ecosystem transaction-rollback-per-test patterns and dedicated
  test-helper packages (e.g. `drizzle-orm-test`, `pgsql-test`).
- Garage's official Docker image (`dxflrs/garage`) documentation —
  resource footprint and single-node test/dev setup steps.
