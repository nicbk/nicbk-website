# Mocking External Services

Researched: 2026-07-05. Decided: 2026-07-05.

Stubbing strategy for GROBID, Semantic Scholar, and Google OAuth (via
Better Auth) across unit tests
([test-runner-and-frameworks.md](./test-runner-and-frameworks.md), Vitest)
and e2e tests ([e2e-testing.md](./e2e-testing.md), Playwright, mocked
GROBID/Semantic Scholar per that file's decision — this file settles the
mechanism it deferred).

## Decision

### Unit tests: MSW (Mock Service Worker)

**MSW**, MIT-licensed, is the mocking tool for Vitest unit tests. It
patches Node's HTTP primitives so any client (fetch, whatever GROBID's
client library uses) is intercepted transparently, with typed, reusable
handler definitions. nock was considered and not adopted — it's
legacy/non-fetch-oriented, and there's no reason to run two mocking
libraries side by side when MSW covers the same ground.

### E2E tests: a mock server container substituted via config, not MSW or Playwright's `page.route()`

This is a genuinely different mechanism from the unit-test approach, not
a smaller version of it — driven by where these calls actually originate.
GROBID/Semantic Scholar calls are made **server-side**, from the app
server's pg-boss background-job pipeline running in its own container in
the full e2e docker-compose stack — they never pass through the browser.
That rules out both of the tools that might look like the obvious choice:

- **Playwright's `page.route()`/`browserContext.route()`** only
  intercepts requests the *browser* makes — architecturally the wrong
  tool for calls that never reach the browser, regardless of Playwright
  being the chosen e2e tool overall.
- **MSW** patches the Node process it's loaded into. In the e2e stack,
  the app server runs in a *separate container* from the Playwright test
  runner process, so MSW in the test process has no way to intercept
  calls happening inside a different container.

The actual pattern: **WireMock or MockServer added as one more service in
the e2e docker-compose stack**, with the app's `GROBID_URL`/
`SEMANTIC_SCHOLAR_URL` env vars pointed at that mock service instead of
the real ones for e2e runs — a config swap, not an interception library.

### Both GROBID and Semantic Scholar are mocked in e2e (not just Semantic Scholar)

Reopened deliberately, not left as an unexamined side effect of
`e2e-testing.md`'s original decision, since GROBID's self-hosted status
made it a genuinely different case worth weighing on its own: GROBID is
self-hosted, already in the compose stack, and not rate-limited — unlike
Semantic Scholar, a genuine external third-party API with real usage
limits. Kept mocked anyway: real GROBID adds slower startup and a ~4GB RAM
footprint to every e2e run, plus non-deterministic PDF-parsing output
variability, none of which e2e needs to re-verify given GROBID's actual
extraction behavior isn't what these tests are checking. The tradeoff
being accepted: e2e never exercises the real GROBID integration — that
coverage gap is accepted, not hidden.

### OAuth: session injection for most tests, endpoint stubbing for the one login-flow test

Two mechanisms, for two different needs:

- For any test that just needs an authenticated user (not testing login
  itself), a valid Better Auth session is generated directly and injected
  as a cookie/`storageState` — skipping the OAuth dance entirely, per
  `e2e-testing.md`'s existing `storageState` setup-project pattern.
- For the one test that actually verifies the login flow itself, Google's
  `/authorize`/`/token`/`/userinfo` endpoints are stubbed via the same
  WireMock/MockServer container used for GROBID/Semantic Scholar — not
  automated against Google's real login UI, which actively detects and
  blocks headless/automation sign-in attempts.

### Fixtures: hand-curated, no record-once-replay tooling

GROBID's TEI-XML output format is stable and documented, and GROBID's own
repository ships real sample TEI-XML responses usable directly as fixture
bodies. Semantic Scholar's JSON responses are straightforward to
hand-author similarly. No record-once-replay tooling (e.g. VCR-style
cassette recording) is needed on top of this — the response shapes are
simple and stable enough that maintaining a small set of hand-curated
fixture files is sufficient.

## Reasoning

- The unit-vs-e2e mocking split isn't a preference — it follows directly
  from where each call actually originates (in-process for anything
  Vitest exercises directly, vs. a separate container for the full e2e
  stack), so treating MSW as sufficient everywhere would have been wrong
  regardless of it being a fine tool in the context it does fit.
- Reopening the GROBID-mocking question explicitly (rather than treating
  `e2e-testing.md`'s original "mock both" as final) was worth doing once
  GROBID's self-hosted, non-rate-limited status made it a genuinely
  different case from Semantic Scholar — but the original decision held
  once weighed on its own merits (determinism/speed outweighing the
  accepted coverage gap for a component whose extraction logic isn't what
  e2e is meant to verify).
- OAuth's two-mechanism split (injection for most tests, stubbing for the
  one login test) avoids the worse alternatives on either side: automating
  Google's real UI is actively blocked by Google itself, while stubbing
  every test's login would mean never actually verifying the login flow
  works at all.

## Sources

- MSW's official docs and current (2026) adoption as the default Node/
  browser HTTP-mocking tool; confirmed MIT license.
- WireMock and MockServer documentation on running as a standalone
  container substituted via service-endpoint configuration — the standard
  pattern for mocking backend-originated calls in full docker-compose e2e
  setups, distinct from browser-level request interception.
- Playwright's own docs on `page.route()`/`browserContext.route()`
  scoping to browser-originated requests only.
- Better Auth's documentation and community guidance on session
  generation/injection for tests, and Google's documented detection of
  headless/automated login attempts.
- GROBID's own repository sample TEI-XML outputs, used as a basis for
  fixture realism/stability assessment.
