# Testing: Home Page

## Unit (Vitest + Testing Library)

- The home route renders both content lines verbatim (`who: ...` and
  `doing: ...`).
- The page renders a main heading (present for focus handoff and document
  structure).

## End-to-end (Playwright)

- Home smoke: navigating to `/` shows the two lines and the header.
- The page renders correctly in both light and dark themes (no flash;
  reuses the theming assertions).

## Accessibility

- `@axe-core/playwright` inline assertion passes (critical/serious) on `/` in
  both themes.
- Heading structure is valid; content contrast meets AA in both themes.

## Not tested here

- Cross-page navigation mechanics (covered by the shell task).
- Docker/production-serving (final task).
