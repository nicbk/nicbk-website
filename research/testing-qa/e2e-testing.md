# E2E Testing

Researched: 2026-07-05. Decided: 2026-07-05.

Browser-level end-to-end testing tool for critical user flows (auth,
upload, reader/annotations) in the TanStack Start app, running inside the
self-hosted, Sysbox-isolated, ephemeral CI runner decided in
[../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md).
Builds on the Vitest/Testing Library unit-testing decision in
[test-runner-and-frameworks.md](./test-runner-and-frameworks.md), which
this doesn't replace — e2e covers full user flows across real routing/
auth/reactivity, unit tests cover isolated logic.

## Decision

### Tool: Playwright

**Playwright**, not Cypress. Out-of-process architecture (drives the
browser over its own protocol) gives real multi-tab and cross-origin
support and free built-in parallelization, versus Cypress running inside
the browser's own run loop (no true multi-tab, cross-origin needs
`cy.origin`, parallelization/analytics gated behind paid Cypress Cloud).
~45% vs. ~14% market share, and multiple 2026 benchmarks report Playwright
23–42% faster with ~67% fewer flaky tests on comparable suites. Full
Chromium/Firefox/WebKit coverage, versus Cypress's Chrome/Edge-primary
support (Firefox still beta since 2020, no WebKit/Safari). Both tools are
genuinely open source (Playwright: Apache-2.0; Cypress's test runner: MIT)
— not a licensing tradeoff either way.

### Testing Zero's WebSocket-driven reactivity: assert on DOM, not the wire

Playwright has no first-class "wait for this WebSocket message" helper
(an open feature request, not a missing fundamental capability), and every
source recommends against asserting on the wire frame directly anyway. The
standard pattern — and the one this project uses — is asserting on the
**resulting DOM state** via Playwright's auto-retrying
`expect(locator).toHaveText(...)`/similar matchers: since Zero's `useQuery`
already re-renders React when an update arrives over the WebSocket, the
UI-level assertion "just works" without any WebSocket-specific
infrastructure. The same approach covers the async upload→job→enrichment
flow: poll for the enriched-article UI state with a longer explicit
timeout rather than building special job-completion signaling into tests.

### Scope: e2e tests run against mocked GROBID/Semantic Scholar responses

E2e tests exercising the upload→GROBID→Semantic Scholar→enrichment flow hit
**mocked** external-service responses, not the real GROBID container or
real Semantic Scholar API — fast and deterministic, with no flakiness from
real network calls, container cold-starts, or Semantic Scholar's rate
limits during CI runs. The actual mocking mechanism (what intercepts these
calls, and whether it's shared with unit tests) is
[mocking-external-services.md](./mocking-external-services.md)'s decision
to make, not this file's — this only settles that e2e tests use mocks at
all, the same boundary pattern `ci-pipeline.md` already used deferring
the test-runner choice to this category.

### Auth: storageState + a one-time login setup project

Google OAuth via Better Auth is not driven through Google's real login UI
in CI — Google actively detects headless/automation signals and blocks it.
The standard, well-documented Playwright pattern applies: a dedicated
"setup project" (e.g. `auth.setup.ts`) logs in once (against a test/seeded
account or a stubbed auth flow) and saves the resulting session via
Playwright's `storageState`, which subsequent test files reuse directly —
no repeated login dance per test.

### File uploads: `setInputFiles()`, no PDF-specific gotchas

Standard Playwright file-upload testing (`setInputFiles()` with a fixture
PDF, or an in-memory buffer) covers this project's upload flow with no
PDF-specific complications found.

## Reasoning

- Playwright vs. Cypress had no genuine contested tradeoff once
  architecture, speed/flakiness benchmarks, and browser coverage were
  weighed together — every axis favored Playwright, and licensing wasn't a
  differentiator since both are open source.
- The WebSocket-reactivity question was investigated directly (rather than
  assumed to be a gap the way the prior topic's `createServerFn` testing
  gap was) — it resolved cleanly to "assert on DOM state," which is worth
  recording explicitly so a future reader doesn't reach for
  wire-level-message assertions unnecessarily.
- Real-vs-mocked external services for e2e was a genuine open question, not
  a settled one — mocking was chosen for CI determinism/speed, but the
  actual mechanism is explicitly left to `mocking-external-services.md`
  rather than decided twice or inconsistently across two files.
- **Flagged, not resolved here**: TanStack Start has no dedicated e2e
  testing documentation, and developers report real, currently-unresolved
  hydration/client-side-routing timing flakiness with Playwright+Start
  specifically. This is a known rough edge to watch for during actual test
  authoring, not something this research found a fix for — recorded here
  so it isn't rediscovered from scratch later.
- Containerized CI introduces its own flakiness class distinct from normal
  test flakiness (resource contention, font-rendering differences,
  viewport mismatches) — mitigated by pinning the Playwright Docker image
  to the exact version in `package.json` (never `latest`) and using
  Playwright's trace viewer as the primary CI-failure debugging tool
  (`docker cp` the trace out of the ephemeral runner, then
  `npx playwright show-trace`).

## Sources

- Playwright vs. Cypress 2026 market-share/adoption and benchmark
  comparisons (multiple sources, consistent on speed/flakiness numbers).
- Playwright's own docs on multi-tab/cross-origin support, `storageState`,
  and the auth "setup project" pattern.
- Cypress's own docs on `cy.origin` and Cypress Cloud's paid
  parallelization/analytics gating.
- Playwright GitHub issue #22417 (or equivalent) — the open feature request
  for WebSocket-message-level waiting, confirming it's a convenience gap,
  not a blocker, given the DOM-assertion pattern works without it.
- TanStack Start community/GitHub discussions confirming no dedicated e2e
  testing documentation exists, and reports of hydration/routing-timing
  flakiness specific to Playwright+Start.
- Docker/CI-specific Playwright guidance on containerized flakiness
  mitigation, image-version pinning, and trace-viewer-based debugging.
