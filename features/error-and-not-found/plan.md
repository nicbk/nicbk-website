# Plan: Error and Not-Found Pages

## Approach

Both fallback pages must render inside the site header, but the header and the
`<main id="main-content" tabIndex={-1}>` landmark currently live only in
`(personal-site)/route.tsx` — the root-level `notFoundComponent`/
`errorComponent` render outside it, which is why the placeholders are
headerless today. Rather than copy that header+`<main>` wrapper into each
fallback component (three near-identical copies), extract a small reusable
**`SiteShell`** and render all three (the personal-site layout, the 404 page,
the error page) inside it. This is the AGENTS "avoid duplication" rule applied
to a shared layout concern.

The 404 page is built alongside the shell extraction because it exercises the
shell in its simplest form. The error page follows, adding the one thing the
404 page doesn't need: an opt-in surface for technical error detail, plus care
that the fallback itself can't throw.

## Task breakdown and sequence

Tasks are sequential — one open at a time, each merged behind its own
PR + CI + human review before the next begins.

1. **[`site-shell-and-not-found`](./tasks/site-shell-and-not-found/description.md)**
   — Extract `SiteShell` (header + focusable `<main>` landmark) and refactor
   `(personal-site)/route.tsx` to consume it (no behavior change there).
   Implement the 404 page inside the shell and wire it to the root
   `notFoundComponent`; ensure an unmatched route returns a real **HTTP 404**
   status in SSR, not a 200. Exit state: navigating to a nonexistent path
   shows the designed 404 inside the header, with a 404 status, and the
   personal-site pages render exactly as before.

2. **[`error-fallback`](./tasks/error-fallback/description.md)**
   — Implement the generic error-fallback page inside `SiteShell` and wire it
   to the root `errorComponent`, with the opt-in technical-detail surface
   (collapsed by default) and a fallback body that avoids anything that could
   re-throw inside the error boundary. Exit state: a thrown top-level render
   error shows the designed fallback inside the header, with error detail
   available but hidden until expanded.

## Sequencing rationale

- The shell extraction is a prerequisite for *both* pages, so it lands in
  task 1 with the simpler of the two pages (404) rather than as a standalone
  refactor with nothing user-visible on top.
- The error page is task 2 because it is strictly the 404 page plus the
  error-detail capability and the re-throw guard — building it second means
  those extras are reviewed in isolation on top of an already-verified shell.
- Both refactor/extend files (`__root.tsx`, `(personal-site)/route.tsx`,
  `-shared/`) that no other in-flight feature touches, so ordering is driven
  by internal dependency, not coordination.
