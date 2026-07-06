# Test Coverage and CI Gating

Researched: 2026-07-05. Decided: 2026-07-05.

Coverage tooling, thresholds, and reporting for the test suite decided
across [test-runner-and-frameworks.md](./test-runner-and-frameworks.md)
(Vitest), [e2e-testing.md](./e2e-testing.md) (Playwright), and
[integration-testing-strategy.md](./integration-testing-strategy.md)
(Testcontainers). Settles what
[../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md)
deferred here: that a test-suite step exists and blocks the PR is already
decided there; this file decides what coverage tooling/threshold (if any)
rides alongside it.

## Decision

### Tooling: Vitest's built-in `v8` coverage provider

**`provider: "v8"`**, Vitest's default — not `@vitest/coverage-istanbul`.
It reads V8's native coverage data instead of instrumenting code, runs
2–3x faster, and needs no extra package. Istanbul used to have better
branch-coverage accuracy (optional chaining, complex ternaries), but
Vitest's 2026 remapping-logic update closed that gap, making Istanbul a
niche choice now (specific instrumentation-based compliance mandates
only — not a consideration for this project). Both are open source.

### Scope: unit-test coverage only, not merged with e2e/integration

Coverage is reported from **Vitest unit tests only**. Playwright e2e and
Testcontainers-based integration tests remain correctness gates — they
must pass, per `ci-pipeline.md`'s existing test-suite-blocks-the-PR rule —
but don't contribute to the coverage number. Merging coverage across all
three layers into one report is real, current practice elsewhere
(`@bgotink/playwright-coverage`, `nyc merge`-style combination of
`coverage-final.json` outputs), but multiple sources describe it as
genuinely fragile in practice — path mismatches between runtimes can
silently drop files from the merged report, and numbers can shift
unexpectedly across merges. For a solo-maintainer project, that fragility
wasn't judged worth taking on for a more complete-looking number; the
tradeoff accepted is that the coverage report doesn't reflect what e2e/
integration tests actually exercise, only what unit tests do.

### Gating: ratchet-style, not a hard percentage floor

CI fails a PR if its coverage number **drops below the current baseline**
— there is no fixed absolute percentage (e.g. no stated "80%") that must
be cleared. This directly engages a genuinely contested practice rather
than picking a side silently: one camp treats hard minimum-percentage
gates as standard and effective at preventing regressions; the opposing
camp — cited across multiple sources — argues fixed percentages encourage
shallow tests written just to clear an unrelated number, without
necessarily testing anything meaningful. The ratchet approach was chosen
as the middle path specifically because it tolerates this project's real,
imperfect starting point (a personal project built up incrementally) while
still preventing silent backsliding, without incentivizing tests written
to hit a number rather than to verify behavior.

**Mechanism** (implementation detail, not yet built): Vitest's JSON
coverage summary from the most recent `main`-branch run is cached/stored
as a build artifact; each PR run downloads it and compares its own
coverage percentage against that stored baseline before failing/passing
the check. The exact caching mechanism (GitHub Actions cache vs. a
committed summary file vs. an artifact fetched via the API) is an
implementation detail to settle when this is actually built, not a
research question with a single right answer.

### Reporting: Vitest's built-in HTML report as a CI artifact, no third-party service

Coverage is visualized via **Vitest's built-in HTML coverage report**,
uploaded as a plain GitHub Actions artifact — not Codecov or Coveralls.
Both of those are genuinely free for public repos (including tokenless
uploads from forked PRs, no paywall found), so this wasn't rejected on
cost grounds — it's a real preference call for keeping coverage data
fully self-contained and not uploaded to a third-party service, consistent
with this project's general tooling preferences, accepting a less
polished PR-diff-coverage-comment experience than Codecov natively
provides.

## Reasoning

- v8-over-Istanbul had no genuine tradeoff left once the 2026 accuracy gap
  closed — pure win on speed with no remaining downside for this project.
- Coverage-merging complexity was weighed directly against its cited
  fragility rather than assumed worth doing because "more coverage
  visibility is strictly better" — for a solo maintainer without a team
  depending on a unified number, the simpler unit-only scope was judged to
  not be worth taking on a currently-fragile multi-tool pipeline.
- The threshold-gating question was presented as genuinely contested
  because it is — this wasn't manufactured balance, multiple independent
  sources land on opposite sides of hard-percentage gating. Ratchet-style
  gating was chosen as the option that specifically fits a project with an
  imperfect, incrementally-built starting point, which a hard fixed floor
  doesn't accommodate well.
- Reporting was a preference call, not a cost-driven decision — Codecov's
  free-tier terms for public repos are genuinely unrestrictive, so
  choosing the self-contained artifact approach was an explicit tradeoff
  of UX polish for not sending coverage data to a third party, not a
  budget constraint.

## Sources

- Vitest's official coverage documentation on the `v8` vs. `istanbul`
  providers, and 2026 updates to `v8`'s remapping/branch-accuracy logic.
- Current guidance and tooling on merging coverage across Vitest/
  Playwright/integration-test layers (`@bgotink/playwright-coverage`,
  `nyc merge`-style workflows), including cited real-world fragility
  (path mismatches, unstable merged numbers).
- Multiple sources on both sides of the coverage-threshold-gating debate
  (hard percentage minimums vs. shallow-test-incentive criticism), and
  ratchet/no-regression gating as a cited middle-ground pattern.
- Codecov and Coveralls current (2026) free-tier terms for public
  repositories, including forked-PR tokenless upload support.
