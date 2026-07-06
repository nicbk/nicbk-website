# Accessibility Testing

Researched: 2026-07-05. Decided: 2026-07-05.

**Thin file, by design.** The actual accessibility CI testing tool
(`@axe-core/playwright`), what it must catch, and its CI severity/blocking
policy (fail only on critical/serious impact) are already fully decided in
[../accessibility/testing-and-tooling.md](../accessibility/testing-and-tooling.md)
— this file doesn't re-decide any of that, only the one question that
doc's own boundary note left to `testing-qa/`: how the axe-core scan
integrates into the structure of the e2e suite decided in
[e2e-testing.md](./e2e-testing.md) (Playwright).

## Decision

### Inline, via a shared fixture — not a dedicated a11y-only spec file

Axe-core scans are added as one more assertion inside the existing
Playwright e2e tests that already visit a given page/route, rather than
written as a separate `accessibility.spec.ts` that revisits every route
solely to scan it. A shared fixture/helper (e.g. `makeAxeBuilder`)
centralizes the axe configuration (tags, severity filtering per
`testing-and-tooling.md`'s critical/serious-only policy) so every call
site — regardless of which test file it's in — scans consistently rather
than each test hand-rolling its own `AxeBuilder` setup.

This avoids redundant page loads (a dedicated file would need to
re-navigate to every route Playwright's functional tests already visit,
just to run a scan) at the acceptable cost of slightly less clean-cut
failure attribution than a fully separate a11y suite would give — a
failing assertion inside a functional test is still unambiguously
labeled as an axe violation via the assertion message, so this cost is
minor.

### Cadence: same as the rest of e2e, every PR

No separate schedule (e.g. full-site scan only on a periodic job) is
introduced. Axe scans run at the same per-PR cadence as the rest of the
e2e suite, since they're fast relative to full page-interaction tests and
no source recommended a lighter/heavier split.

### SPA route transitions: no special handling needed

TanStack Router's client-side navigation doesn't require any extra
tooling or a forced reload between routes — `AxeBuilder.analyze()` simply
scans whatever DOM state exists when it's called. The pattern is: perform
the navigation/interaction via Playwright locators first, then call
`.analyze()` — identical to scanning any interaction-revealed state (a
modal, lazy-loaded content), which axe-core handles correctly without
needing a full page reload.

## Reasoning

- All three sub-questions here converged on a fairly clean current
  consensus rather than surfacing a genuine unsettled debate (unlike, for
  example, the coverage-threshold-gating question in
  [test-coverage-and-ci-gating.md](./test-coverage-and-ci-gating.md)) — so
  this file states a direct decision rather than presenting a contested
  tradeoff that doesn't actually exist in the sources.
- Keeping this file thin and cross-referencing
  `accessibility/testing-and-tooling.md` rather than restating its
  content follows AGENTS.md's avoid-duplication principle directly — that
  file already made the tool/severity decisions in full; re-deciding them
  here would risk the two documents drifting out of sync over time.

## Sources

- [playwright.dev/docs/accessibility-testing](https://playwright.dev/docs/accessibility-testing) —
  official guidance on integrating axe scans into existing tests vs.
  dedicated files, and scanning interaction-revealed DOM state.
- [testdino.com/blog/playwright-accessibility](https://testdino.com/blog/playwright-accessibility) —
  CI cadence guidance (per-PR, same as functional tests).
- [dev.to/subito — automating accessibility testing with Playwright and Axe](https://dev.to/subito/how-we-automate-accessibility-testing-with-playwright-and-axe-3ok5) —
  shared-fixture pattern for centralizing axe configuration.
- [medium.com — Run UI and Accessibility Tests from Playwright Page Objects](https://medium.com/@evgeniy.otsevich/one-test-two-wins-run-ui-and-accessibility-tests-from-your-playwright-page-objects-with-706da09fdaec) —
  inline-scan-via-shared-helper pattern.
