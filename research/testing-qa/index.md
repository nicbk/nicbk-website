# Research: Testing & QA

Status: fully researched and decided (2026-07-05, 6/6 topics).

What to test, at what levels (unit/integration/e2e), and which tooling to
use across the shared infrastructure and sub-applications. Builds on the
stack decided in [../technologies/index.md](../technologies/index.md)
(TanStack Start on Vite, Zero, Postgres, Drizzle, Better Auth, Garage,
GROBID + Semantic Scholar) and the single-package topology decided in
[../system-architecture/monorepo-structure.md](../system-architecture/monorepo-structure.md).
Owns the "test suite" step already required (but not specified) by
[../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md).

## Topics

- [test-runner-and-frameworks.md](./test-runner-and-frameworks.md) —
  Decided. **Vitest** + `@testing-library/react`/jsdom, mocking/assertions
  built into Vitest. TanStack Start has no official testing story for route
  components/`createServerFn`/Zero's `useQuery` in isolation — handled via
  a **thin-wrapper convention** (`createServerFn` bodies stay pass-throughs
  to plain testable functions), propagated to
  [../coding-conventions/file-hierarchy-and-complexity.md](../coding-conventions/file-hierarchy-and-complexity.md).
- [e2e-testing.md](./e2e-testing.md) — Decided. **Playwright** over
  Cypress (architecture, speed/flakiness benchmarks, browser coverage).
  Zero's WebSocket reactivity is tested by asserting on resulting DOM
  state, not the wire. E2e tests run against **mocked** GROBID/Semantic
  Scholar responses (mechanism deferred to
  [mocking-external-services.md](./mocking-external-services.md)).
  `storageState` + a one-time login setup project for Google OAuth.
  Flagged, unresolved: TanStack Start has no official e2e testing docs and
  known hydration/routing-timing flakiness with Playwright+Start.
- [integration-testing-strategy.md](./integration-testing-strategy.md) —
  Decided. **Testcontainers** Postgres (transaction-rollback-per-test for
  Drizzle isolation), a real **Garage** container (not MinIO). Zero:
  integration tests hit `/query`/`/mutate` handlers against Postgres only
  — no real `zero-cache`, since business logic lives in the handlers;
  live sync verification is e2e's job. This tier split is an inference
  from Zero's architecture, not an official Rocicorp recommendation (no
  such guidance exists yet).
- [mocking-external-services.md](./mocking-external-services.md) —
  Decided. **MSW** for unit tests (Vitest, in-process). For e2e: a
  genuinely different mechanism, not MSW — a **WireMock/MockServer
  container** in the e2e compose stack, config-swapped in via
  `GROBID_URL`/`SEMANTIC_SCHOLAR_URL`, since GROBID/Semantic Scholar calls
  originate server-side and never pass through the browser (ruling out
  both MSW and Playwright's `page.route()`). Both GROBID and Semantic
  Scholar stay mocked in e2e (reopened and reconfirmed, not assumed).
  OAuth: session injection for most tests, endpoint stubbing (same mock
  container) for the one login-flow test.
- [test-coverage-and-ci-gating.md](./test-coverage-and-ci-gating.md) —
  Decided. Vitest's built-in **`v8`** coverage provider. Scope: **unit
  tests only**, not merged with e2e/integration (merging is real practice
  elsewhere but cited as fragile). Gating: **ratchet-style** (coverage
  can't drop PR-over-PR, no fixed percentage floor) — a deliberate choice
  on a genuinely contested practice. Reporting: Vitest's HTML report as a
  CI artifact, not Codecov, to stay self-contained.
- [accessibility-testing.md](./accessibility-testing.md) — Decided. Thin
  file by design — the actual tool/severity policy is already decided in
  [../accessibility/testing-and-tooling.md](../accessibility/testing-and-tooling.md).
  Only settles suite placement: axe-core scans are **inline assertions**
  in existing Playwright e2e tests (via a shared fixture), not a
  dedicated `accessibility.spec.ts`, at the same per-PR cadence as the
  rest of e2e, with no special handling needed for SPA route transitions.
