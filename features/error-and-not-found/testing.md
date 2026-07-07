# Testing: Error and Not-Found Pages

Testing requirements for the feature as a whole, per the decided testing
tiers (see [research.md](./research.md) for citations). Each task's
`testing.md` states the concrete tests that task must add.

## Tiers in play

No data layer, so the integration tier does not apply. Coverage is unit +
e2e + inline accessibility.

## Unit (Vitest + `@testing-library/react`, jsdom)

- `SiteShell` renders the site header and a focusable
  `<main id="main-content" tabIndex={-1}>` wrapping its children.
- The 404 page renders "page not found" (no "404" numeral) and a home link
  with the correct href, and exposes a main heading.
- The error page renders "something went wrong" and a home link; the
  technical detail is **not** shown by default and **is** revealed when the
  disclosure is activated; given an error, the revealed content includes the
  error message.
- Regression: the personal-site layout still renders the header and the
  focusable `<main>` after being refactored onto `SiteShell`.

## End-to-end (Playwright)

- **404**: navigating to a nonexistent path shows the designed 404 inside the
  header; the **HTTP response status is 404** (asserted on the navigation
  response, not just the DOM); the home link returns to `/`.
- **Error fallback**: a route/hook forced to throw renders the fallback inside
  the header; the technical-detail disclosure is collapsed initially and
  expands on activation. (Uses a test-only trigger for the throw; no
  production route is left able to error on demand.)
- **Theming**: both pages show no flash of the wrong theme and are correct in
  both themes.

## Accessibility

- `@axe-core/playwright` runs inline on both the 404 and error pages in both
  themes, blocking on critical/serious findings.
- Heading structure is valid; the disclosure control has a discernible
  accessible name and is keyboard operable; contrast and focus indicators meet
  AA in both themes.

## Coverage / gating

- Vitest `v8` coverage, unit-only, ratchet-style (must not drop PR-over-PR).

## Framework caveats to carry

- Same flagged TanStack Start + Playwright hydration/routing-timing flakiness
  as the shell feature: assert on settled DOM/response state, don't race
  hydration.
- The **HTTP-404-status** behavior must be verified against TanStack Start's
  actual not-found handling rather than assumed — it is the one requirement
  here most likely to differ from the framework's default (a 200 with
  not-found content). Treat "confirm the real status" as part of the test,
  not a given.
