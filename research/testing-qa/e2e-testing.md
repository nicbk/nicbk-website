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

## Addendum (2026-07-06): CI Runner Revised to GitHub-Hosted

The self-hosted Sysbox runner this doc's intro assumed was revised to
GitHub-hosted runners — see the 2026-07-06 addendum in
[../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md).
Nothing decided here changes: Playwright e2e already runs green on
GitHub-hosted `ubuntu-latest` in the live CI workflow (traces are
retrieved via the `actions/upload-artifact` failure path rather than
`docker cp`).

## Addendum (2026-08-01): CSS transitions are a second flakiness source

Alongside the hydration-timing gap flagged above, a distinct and equally
repeatable one showed up while testing the user-settings modal: **a colour
check that runs while a CSS transition is still playing measures a blend that
is never a resting state.** It hit both an `@axe-core/playwright` contrast scan
right after a theme toggle (the site's controls transition colour over
`--motion-duration-fast`) and one taken on a modal still fading in.

Two fixes, both in place:

- `toggleThemeTo` (`e2e/fixtures.ts`) now awaits
  `document.getAnimations()` before returning, so "the theme is dark" means the
  page has finished *looking* dark.
- A test that opens an animated surface waits for it to settle — e.g.
  `await expect(dialog).toHaveCSS('opacity', '1')` — because Playwright counts
  an element as visible from the first frame of its fade-in.

Assertions written with `toHaveCSS`/`toHaveAttribute` retry and so settle on
their own; one-shot reads (`evaluate`, `screenshot`, an axe scan) do not. That
distinction is the thing to remember.

## Addendum (2026-08-01): the hydration gap, measured — and why the local run lies

The hydration-timing gap flagged above was recorded as "a known rough edge,
not something this research found a fix for". It has now been measured and
closed, and measuring it turned up a second, separate problem.

**The gap is real and large.** On the dev server this suite runs locally,
against `/blog`: `window.__TSR_ROUTER__` appears around **590ms**, React
attaches handlers around **650ms**, and clicks only start taking effect around
**820ms**. Before that, Playwright finds and clicks a real, visible, enabled,
server-rendered button and the click lands on inert markup. Nothing errors.

`fill()` is the quieter version of the same thing: it sets the input's value
directly, so the field *looks* filled while React never saw the event. A
following assertion then measures an unfiltered list against a value that is
plainly on screen, which reads as a product bug rather than a lost event.

**The fix is to assert the end state and retry the interaction**, which is what
`toggleThemeTo` already did and what `toggleTagTo` / `searchPostsFor`
(`e2e/fixtures.ts`) now do for the other two controls. Retrying is safe
precisely because the assertion names the desired end state: an interaction
that was swallowed changed nothing and is retried, one that landed satisfies
the assertion and is not repeated.

Two tempting alternatives were measured and rejected:

- **Waiting on `window.__TSR_ROUTER__`** looks like a first-party hydration
  signal but lands ~60ms *before* handlers attach, so it is not one.
- **Waiting on a React fiber key** (`__reactFiber$…` / `__reactProps$…`) does
  track the real moment, but it is private API that React has renamed before.

**The second problem: `npm run test:e2e` locally is not the suite CI runs.**
Locally the webServer is `npm run dev`; in CI it is `npm run build && npm run
start`. That is not just a speed difference — the dev server deliberately
serves draft posts for local preview (`import.meta.env.PROD` gates the
exclusion in `blog/-lib/load-listing.ts`), so every assertion about how many
posts the list contains is written against the production set and **cannot
pass in dev**. Dev-only framework markup also trips axe: an injected
`<code style="color: red">` on the error-fallback route fails contrast at
4.0:1 and does not exist in a production build.

So a local `npm run test:e2e` reporting a handful of failures is expected, and
reading those as regressions wastes real time — it did here. `npm run
test:e2e:prod` runs this config with `CI=true` and is the one to trust:
production build, drafts excluded, 62/62 green and stable across repeats.
Keep `npm run test:e2e` for iterating on a single test, not for judging the
suite.

## Addendum (2026-08-09): the setup project was decided here and built late

"Auth: storageState + a one-time login setup project" above is a *decision*, and
the signed-in tier did not follow it. Every spec in `e2e-auth/` signed in for
itself, so by the time the tier had 88 tests it was performing 88 full OAuth
round trips — the "repeated login dance per test" this file rules out in so many
words. Nobody chose that; it accumulated, one spec at a time, because the first
spec written was `sign-in-flow.spec.ts`, for which signing in per test is
correct.

The cost, measured before the fix: `collection-cards.spec.ts` is five tests
whose bodies are "insert a row, look at the card", and it took **56 seconds** —
about eleven per test, almost none of it assertions. Each one paid for a guarded
page, a redirect to `/sign-in`, an SSR render, hydration, a click, the stubbed
consent screen, a callback, and a second redirect, before doing anything it was
written to do.

`auth.setup.ts` now signs in once and the browser project depends on it. Three
places opt back out, and the reason is the same in all three — **they are about
sessions rather than about pages**:

- `sign-in-flow.spec.ts`, which drives the real round trip. Starting it signed in
  would leave it asserting nothing.
- `user-settings.spec.ts`, which logs out and deletes the account. A session
  reused from the setup step would be dead for everything after it, and the
  account behind it gone — which is also why that file is deliberately last
  alphabetically.
- The route-guard test in `lit-tracker.spec.ts`, which has to arrive with no
  session because that is the whole assertion.

Everything else navigates with `landOn`, which goes straight to the page and
asserts it landed there — so a missing or dead shared session fails on the first
line with an obvious cause, rather than as a pile of confusing assertion
failures further down.

**Still outstanding: `workers: 1`.** The stubbed Google has exactly one account
(`support/google-stub.mjs`), so parallel workers would fight over it and over
the one database. The authorization *code* is already chosen by the spec and read
by the in-process token stub, which makes it a ready-made channel for "which
account is signing in" — the natural next step, left out of this change on
purpose.

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
