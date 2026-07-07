# Testing: Site Shell + Not-Found Page

## Unit (Vitest + Testing Library)

- `SiteShell` renders the site header and a focusable
  `<main id="main-content" tabIndex={-1}>` wrapping its children.
- **Regression:** the personal-site layout, refactored onto `SiteShell`,
  still renders the header and the focusable `<main>` landmark (guards the
  output-neutral requirement).
- The 404 page renders "page not found" (no "404" numeral) and a home link
  with the correct href, and exposes a single main heading.

## End-to-end (Playwright)

- Navigating to a nonexistent path shows the designed 404 inside the header;
  the home link returns to `/`.
- **HTTP status:** the navigation response to a nonexistent path is **404**
  (asserted on the response, not just the rendered DOM).
- The existing shell/nav/skip-link/focus e2e still passes unchanged (the
  refactor didn't alter layout behavior).
- Theming: no flash; correct in both themes.

## Accessibility

- `@axe-core/playwright` inline on the 404 page passes (critical/serious) in
  both themes; heading structure valid; contrast/focus meet AA.

## Not tested here

- The error-fallback page and its technical-detail disclosure (task 2).
