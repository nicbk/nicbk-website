# Testing: App Shell and Header

## Unit (Vitest + Testing Library)

- Header renders the site name and exactly the three nav links
  (`projects`/`blog`/`about`) with correct hrefs; the site name links to `/`.
- Header renders no auth UI and no active-page marker.

## End-to-end (Playwright)

- The skip-to-main-content link is the first focusable element on Tab and,
  when activated, moves focus to `<main>`.
- On client-side navigation between two routes, focus lands on the
  destination page's main heading.
- The header remains visible after scrolling (sticky), single-row at narrow
  and wide viewports.
- Navigating to a route that does not exist renders the minimal not-found
  handling; a thrown render error is caught by the root error boundary rather
  than blanking the app.

## Accessibility

- `@axe-core/playwright` inline assertion passes (critical/serious) on a
  shell-rendered page in both themes.
- Header nav is reachable and operable by keyboard; focus indicators visible.

## Not tested here

- Home-page content specifics (next task).
- The designed 404 / error-fallback pages (separate feature).
