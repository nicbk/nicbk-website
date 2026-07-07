# Task: Error-Fallback Page

Deliver the top-level generic error page on top of the `SiteShell` established
by `site-shell-and-not-found`.

## What this task does — concretely

- **Implement the error-fallback page** as a component rendered inside
  `SiteShell`: plain-text "something went wrong" and a link home, same tone as
  the 404 page. Wire it to the root route's `errorComponent` in `__root.tsx`,
  replacing the current bare-`<main>` `RootErrorFallback` placeholder.
- **Optional technical detail**: surface the underlying error message (and
  stack, where available) inside a **collapsed disclosure** (e.g. a
  `<details>`/Base UI equivalent) that is hidden by default and expands only
  on explicit user action. The generic message is the default view; the
  detail is available, not hardcoded away.
- **Keep the fallback defensive**: it renders only the static header (via
  `SiteShell`) and plain text — no data access, no risky computation — so
  rendering the fallback cannot itself throw inside the error boundary.

## Not in this task

- The 404 page and the `SiteShell` extraction (task 1).
- Per-route error boundaries or per-component reactive error states (not in
  this feature).

## Watch out

- The `errorComponent` receives the `error`; treat its `message`/`stack` as
  possibly-undefined and render defensively (an error with no message must
  still yield a valid page).
- Base UI is the primitive library — if a disclosure primitive fits, use it
  rather than hand-rolling ARIA; otherwise a native `<details>` is acceptable
  and simplest.
