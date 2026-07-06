# Testing: App Shell + Home Page

Testing requirements for the feature as a whole, per the decided testing
tiers (see [research.md](./research.md) for citations). Each task's
`testing.md` states the concrete tests that task must add.

## Tiers in play

Because this feature has no data layer, the **integration tier**
(Testcontainers Postgres/Garage, `/query`/`/mutate` handlers) does **not**
apply here — it enters with the first data-backed feature. This feature is
covered by unit and e2e tests plus inline accessibility assertions.

## Unit (Vitest + `@testing-library/react`, jsdom)

- The site header renders the site name and the three nav links with correct
  hrefs, and the site name links to home.
- The home page renders the two static content lines.
- Theme logic: the resolver picks OS preference when no stored choice exists,
  honors a stored override, and toggling flips `data-theme` — asserted at the
  plain-function level (theme logic is deliberately outside React).
- `env.ts` rejects missing/invalid required variables (Zod schema parses/
  throws as expected).
- Any non-trivial pure helper is unit-tested directly; per the thin-wrapper
  convention, logic lives in plain exported functions, not inside framework
  wrappers, so it is testable without the framework.

## End-to-end (Playwright)

- **Smoke**: the app boots, the home page loads, and its two lines and the
  header are visible.
- **Navigation**: header nav links point at the right routes; focus moves to
  the new page's heading on client-side navigation; the skip-to-main link is
  the first focusable element and works.
- **Theming**: first paint shows no flash of the wrong theme; the manual
  toggle persists across reload.
- Zero's reactivity is not exercised here (no reactive data); e2e asserts on
  resulting DOM state, not any wire protocol.

## Accessibility

- `@axe-core/playwright` runs inline within the e2e tests (shared fixture),
  blocking on critical/serious findings, in both light and dark themes.
- Contrast is audited independently for each theme; focus indicators meet the
  ≥2px / 3:1 requirement.

## Coverage / gating

- Vitest `v8` coverage on unit tests only, ratchet-style (must not drop
  PR-over-PR); the HTML report is a CI artifact. No fixed percentage floor.

## Framework caveat to carry

TanStack Start has no official e2e story and has known hydration/routing-
timing flakiness with Playwright; tests must assert on settled DOM state and
tolerate that timing rather than racing hydration. This is a flagged, known
risk from the e2e research, not a novel problem to solve here.
