# Constraints and Behavior: Site Shell + Not-Found Page

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"Shared shell" and "404 / Not-found page" sections):

- A reusable `SiteShell` renders the sticky site header and the
  `<main id="main-content" tabIndex={-1}>` landmark around its children, and
  is the single definition of that wrapper.
- `(personal-site)/route.tsx` uses `SiteShell` with no change to its rendered
  output.
- An unmatched route renders the designed 404 inside `SiteShell`: plain-text
  "page not found" (no numeric code) + a home link, minimalist style, with a
  main heading for the skip-link / focus handoff.
- The not-found response carries a real HTTP 404 status on server render.

## Behavior details

- **Output-neutral refactor:** after moving the personal-site layout onto
  `SiteShell`, the header, nav, theme toggle, `<main>` landmark id/tabindex,
  and skip-link / focus-handoff behavior are byte-for-byte equivalent to
  before. A regression unit test asserts the header and focusable `<main>`
  are still present.
- **404 wiring:** the root `notFoundComponent` renders the 404 page inside
  `SiteShell`; the prior placeholder `RootNotFound` is removed.
- **Status:** navigating (SSR) to a nonexistent path returns HTTP 404, not
  200. If TanStack Start defaults to 200, the status is set through its
  supported not-found mechanism; the e2e asserts the actual status.
- Correct in both themes, keyboard/screen-reader navigable, AA contrast and
  focus visibility.

## Dependencies

- The `SiteHeader`, skip link, focus handoff, tokens, and theming from
  [`app-shell-and-home`](../../../app-shell-and-home/description.md) (reused;
  the header is wrapped by `SiteShell`, not modified).
