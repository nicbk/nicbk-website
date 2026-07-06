# Testing & Tooling

Researched: 2026-07-05. Decided: 2026-07-05.

What tooling enforces the rest of this category's decisions, at what point
in the workflow, and how strictly — resolving the accessibility-linting gap
that
[../coding-conventions/formatting-and-linting.md](../coding-conventions/formatting-and-linting.md)
explicitly deferred to this category (Biome was believed to lack a
`jsx-a11y`-equivalent plugin ecosystem).

## Decision

- **Static linting: Biome's built-in `a11y` lint-rule group**, part of
  Biome's recommended ruleset and enabled by default — no supplementary
  ESLint/`jsx-a11y` tool is added. **This corrects, rather than resolves, a
  gap:** Biome has shipped JSX/TSX accessibility rules (alt text, anchor
  content, ARIA role/prop validity, button types, `autofocus`, `tabindex`,
  `lang` attributes, and more) since v1.0, and Biome v2.4 (released
  2026-02-10) added further checks — meaning the project already has
  baseline static a11y linting today with zero extra configuration, and the
  gap noted in
  [../coding-conventions/formatting-and-linting.md](../coding-conventions/formatting-and-linting.md)
  was outdated at the time it was written. See that document's own
  correction note.
- **Automated runtime testing: `@axe-core/playwright`**, integrated into
  the CI pipeline as part of the existing Gate 2 (automated CI/CD) from
  [../project-management-conventions/review-process.md](../project-management-conventions/review-process.md).
  This covers what static linting structurally cannot — dynamic ARIA
  state, computed focus order, and actual rendered color contrast in a real
  browser DOM — by attaching axe-core's scan to whatever Playwright pages
  the eventual e2e test suite already visits. Rule scope: WCAG 2.2 Level AA
  (matching [conformance-target.md](./conformance-target.md)).
- **CI severity policy: fail only on `critical`/`serious` impact
  violations** (e.g. keyboard traps, missing accessible names, insufficient
  contrast). `moderate`/`minor` findings are logged/tracked but do not block
  a merge — this uses axe-core's standard `includedImpacts` mechanism, not
  a bespoke severity scheme. A blanket fail-on-everything policy would
  create noise disproportionate to a small site's stakes; the two most
  severe tiers are the violations that actually block or seriously degrade
  use.
- **Automated tooling is explicitly not treated as sufficient for
  conformance.** Linting plus axe-core together catch an estimated ~30% of
  WCAG success criteria — the rest require human judgment (e.g. whether
  alt text is actually meaningful, whether reading order makes sense).
  Meeting the [conformance-target.md](./conformance-target.md) AA target
  therefore still depends on the manual keyboard/screen-reader checks
  already folded into Gate 1/Gate 3 in
  [keyboard-and-focus-management.md](./keyboard-and-focus-management.md) —
  this document does not claim CI automation alone satisfies AA.
- **Boundary with `testing-qa/`**: this document decides *that* an
  automated runtime a11y check exists, runs in CI, uses axe-core
  semantics, and what it must catch and block on. The test-runner/
  framework itself (Vitest), the e2e tool (Playwright), and how the
  axe-core scan integrates into the e2e suite's structure (inline via a
  shared fixture, not a dedicated spec file) are decided in
  [../testing-qa/test-runner-and-frameworks.md](../testing-qa/test-runner-and-frameworks.md),
  [../testing-qa/e2e-testing.md](../testing-qa/e2e-testing.md), and
  [../testing-qa/accessibility-testing.md](../testing-qa/accessibility-testing.md)
  respectively — the same boundary pattern already used between
  [../project-management-conventions/index.md](../project-management-conventions/index.md)
  and `../devops-deployment/index.md`.

## Reasoning

- Correcting the formatting-and-linting.md gap claim (rather than silently
  adding a new tool on top of an assumed gap) matters because acting on
  stale information would have added an unnecessary ESLint/`jsx-a11y`
  dependency alongside Biome, directly against the low-friction/
  avoid-duplication guidance already governing this project's tooling
  choices.
- `@axe-core/playwright` is the natural fit rather than a jest-axe/
  cypress-axe alternative because it drives a real rendered DOM in a real
  browser — required to catch computed contrast and focus order, which a
  jsdom-based unit-test integration (jest-axe) cannot observe accurately —
  and Playwright is already the standard e2e choice for a React/TanStack
  Start stack, so axe attaches to test infrastructure this project would
  need regardless of accessibility.
- The critical/serious-only blocking policy mirrors the same proportionality
  reasoning used throughout this category (AA over AAA, Base UI over
  hand-rolled ARIA): enough automated enforcement to catch real, blocking
  defects, without imposing an enterprise-compliance-level CI gate on a
  personal site.
- Being explicit that automation only covers ~30% of WCAG criteria prevents
  a false sense of complete conformance — a "CI is green" state should not
  be read as "the site meets Level AA," since a meaningful fraction of
  criteria are not mechanically checkable at all.

## Sources

- [biomejs.dev/blog/biome-v2-4](https://biomejs.dev/blog/biome-v2-4/) —
  Biome v2.4 release notes, additional a11y rule coverage.
- [biomejs.dev/linter/rules/use-alt-text](https://biomejs.dev/linter/rules/use-alt-text/) —
  example of an existing Biome a11y rule, confirming JSX/TSX coverage
  predates v2.4.
- [github.com/biomejs/biome discussion #7128](https://github.com/biomejs/biome/discussions/7128) —
  community discussion characterizing Biome's a11y rule-group maturity.
- [playwright.dev/docs/accessibility-testing](https://playwright.dev/docs/accessibility-testing) —
  official `@axe-core/playwright` integration guide.
- [testdino.com/blog/playwright-accessibility](https://testdino.com/blog/playwright-accessibility) —
  CI integration patterns (PR-time smoke scan vs. scheduled full scan) and
  the ~30%-of-WCAG-automatable figure.
- [github.com/dequelabs/axe-core issue #2798](https://github.com/dequelabs/axe-core/issues/2798) —
  axe-core's critical/serious/moderate/minor impact-level definitions.
- [dev.to/subito — automating accessibility testing with Playwright and Axe](https://dev.to/subito/how-we-automate-accessibility-testing-with-playwright-and-axe-3ok5) —
  fail-on-critical/serious, track-the-rest CI severity pattern.
