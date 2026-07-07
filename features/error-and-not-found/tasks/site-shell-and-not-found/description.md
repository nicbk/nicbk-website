# Task: Site Shell + Not-Found Page

Extract the shared header shell and deliver the 404 page on top of it — the
first, simplest use of the shell.

## What this task does — concretely

- **Extract `SiteShell`** — a component rendering the existing `SiteHeader`
  and the `<main id="main-content" tabIndex={-1}>` landmark around
  `children`. Lives as a shared component (e.g. under
  `src/routes/-shared/components/site-shell/`, alongside `skip-link` /
  `theme-toggle`), with a colocated CSS Module only if it needs styling
  beyond what the header/`main` already carry.
- **Refactor `(personal-site)/route.tsx`** to render its `<Outlet />` inside
  `SiteShell` instead of inlining the header + `<main>` wrapper. This must be
  **output-neutral**: same DOM, same header, same focusable landmark, same
  skip-link / focus-handoff targets as before.
- **Implement the 404 page** as a component rendered inside `SiteShell`:
  plain-text "page not found" (no numeric "404") and a link home, with a main
  heading for the focus handoff. Wire it to the root route's
  `notFoundComponent` in `__root.tsx`, replacing the current bare-`<main>`
  `RootNotFound` placeholder.
- **Ensure a real HTTP 404 status** on server render for unmatched routes —
  verify TanStack Start's actual behavior and set the status via its
  supported mechanism if it defaults to 200.

## Not in this task

- The error-fallback page (task 2) — though it will reuse `SiteShell`.
- Any change to the header's own markup/behavior (reused as-is).

## Watch out

- The refactor of `(personal-site)/route.tsx` is the risky part: keep its
  rendered output identical (guarded by a regression unit test) so existing
  shell/nav/focus e2e keeps passing.
