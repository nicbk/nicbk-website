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

### Revision (2026-08-01, at implementation time): how Google's endpoints are stubbed

The decision above — stub Google's `/authorize`, `/token`, and `/userinfo`
via the WireMock/MockServer container, pointing the app at it by config —
turned out not to be implementable as written for Better Auth's Google
provider. Building the sign-in flow e2e
(`features/authentication/tasks/sign-in-and-route-guard`) established:

- **The token endpoint is not configurable.** `@better-auth/core`'s
  `social-providers/google.ts` passes the literal
  `https://oauth2.googleapis.com/token` into `validateAuthorizationCode`.
  Only `authorizationEndpoint` is overridable through `ProviderOptions`.
  Overriding the token endpoint is an open upstream feature request
  ([better-auth#8811](https://github.com/better-auth/better-auth/issues/8811),
  [#2047](https://github.com/better-auth/better-auth/issues/2047)) as of
  better-auth 1.6.25, the current release.
- **It cannot be redirected either.** That exchange goes through
  `fetchRefusingRedirects`, which rejects any 3xx response as possible SSRF.
  So a stub can't be reached by bouncing the request, and the call is
  `https://`, so a hosts-file swap would additionally need a trusted CA.
- **`/userinfo` is never called.** The provider reads the profile out of the
  `id_token` with `decodeJwt` instead, so there is no third endpoint to stub.

The substance of the decision is unchanged and still binding: Google's
endpoints are stubbed, Google's real login UI is never automated, and most
auth-requiring tests inject a session instead. What changed is the seam, and
in each case it is the boundary the request actually crosses:

- `/authorize` is a **browser navigation**, so Playwright's `page.route()`
  intercepts it — the tool this file rules out for GROBID/Semantic Scholar
  precisely because *those* calls never reach the browser. Here it is the
  correct one for the same reason, applied the other way round.
- `/token` is a **server-side `fetch` inside the app process**, so it is
  stubbed there, by a module preloaded with Node's `--import` hook
  (`e2e-auth/support/google-token-endpoint-stub.mjs`). The mock-server
  container was chosen for calls originating in a *separate* container from
  the test runner; the sign-in e2e's app server is a local process Playwright
  starts, so that constraint does not apply. The stub validates the exchange
  (`grant_type`, `code`, `code_verifier`, `redirect_uri`) and rejects a
  malformed one the way Google would, so a broken PKCE flow still fails.

If Better Auth later ships a `tokenEndpoint` override, the preload can be
replaced by a config swap and the mechanism returns to what this file
originally described.

### Revision (2026-08-08, at implementation time): GROBID's stub is a process, not a container

Building the extraction pipeline
(`features/article-upload-and-extraction/tasks/grobid-extraction-pipeline`)
kept the substance of the decision above and changed only its packaging.
**The mechanism is exactly the one this file specifies** — `GROBID_URL` is
pointed at a stub, a config swap rather than an interception library, and
the accepted coverage gap ("e2e never exercises the real GROBID") stands
unchanged. What is not a container is the stub itself
(`e2e-auth/support/grobid-stub.mjs`, started by the tier's launcher).

The container was chosen for calls originating in a *separate* container
from the test runner. In the signed-in tier the app server is a local
process Playwright starts — the same reason the Google token stub is
in-process — so that constraint does not apply, and a container would add an
image pull to every run for a few hundred bytes of XML.

### Revision (2026-08-09, at implementation time): Semantic Scholar follows the same pattern, and MSW is still not the unit-test tool

Building the enrichment stage
(`features/article-upload-and-extraction/tasks/semantic-scholar-enrichment`)
produced the second half of what this file describes, plus one standing
divergence worth stating rather than leaving to be rediscovered.

**The Semantic Scholar stub is a process too**
(`e2e-auth/support/semantic-scholar-stub.mjs`), for the reasons the revision
above gives, and for one specific to this service: the real API is a pool
shared with every other unauthenticated caller on the internet and throttles by
current load, so a suite pointed at it would pass or fail depending on how busy
that pool happened to be. Twelve concurrent requests against it returned eight
429s. The mocking decision this file makes was never in doubt here; the only
question was packaging.

Its instruction reaches it the same way GROBID's does — out of the uploaded
file. The GROBID stub emits whatever DOI the upload's directive names, and this
stub decides what to do from that DOI's shape. One directive in one file
therefore chooses the behaviour of both services, which keeps the stateless,
no-control-channel property the revision above singles out.

**MSW is still not installed, and unit tests stub `fetch` directly.** This file
decides MSW for the unit tier; task 4 stubbed `fetch` with `vi.stubGlobal`
instead, and task 5 followed it rather than run two HTTP-mocking mechanisms in
adjacent files. Both clients are small — one `fetch` call each, no client
library underneath — which is the case MSW's transparency argument is weakest
for. Recorded here because it is now a *pattern* rather than an oversight: the
next server-side client should stub `fetch` too, or MSW should be adopted
deliberately and both existing clients moved onto it. What must not happen is a
third file inventing a third way.

One premise above did weaken and is worth naming: the "~4 GB RAM footprint"
describes `grobid:0.9.1-full`, and the stack runs `0.9.1-crf` (~510 MB,
CPU-only), which starts in well under a minute. Mocking still holds on the
other two grounds — non-deterministic extraction output, and a real GROBID
call taking around fifteen seconds per paper — but it is no longer the
resource argument it was written as.

One thing worth carrying: the stub reads its instruction out of **the
uploaded file itself** (a `% grobid-stub {...}` directive line), rather than
holding state a test sets beforehand. That is what lets one submission
contain a document that extracts and one that cannot — the case a per-job
pipeline is most likely to get wrong — and it keeps the stub stateless
between requests.

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
