# Status: Site Shell + Not-Found Page

**State:** Merged (2026-07-07). All gates green (typecheck, Biome, 42 unit
tests, 12 e2e against the production build); CI passed and the PR was approved
and merged.

- Branch: `error-and-not-found/site-shell-and-not-found`.
- Sub-issue: [#21](https://github.com/nicbk/nicbk-website/issues/21)
  (parent [#20](https://github.com/nicbk/nicbk-website/issues/20)); self-assigned.
- PR / CI / review: [#32](https://github.com/nicbk/nicbk-website/pull/32)
  merged (CI passed, approved).

## Notes carried into implementation

- The `(personal-site)/route.tsx` refactor onto `SiteShell` must be
  output-neutral (regression-tested); keep the header/`<main>`/skip-link/
  focus-handoff behavior identical.
- Verify TanStack Start's real not-found HTTP status and set 404 explicitly
  if it defaults to 200.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started.
- 2026-07-06 — Implemented. Moved `site-header` into
  `src/routes/-shared/components/` (now site-wide), extracted `SiteShell`
  (header + focusable `<main>`), refactored `(personal-site)/route.tsx` onto
  it (output-neutral, regression-tested), and added the designed lowercase
  "page not found" page wired to the root `notFoundComponent`. Verified
  TanStack Start's root `notFoundComponent` returns a real **HTTP 404** on
  the production build (e2e asserts the response status). Added
  `routeFileIgnorePattern` to the Start plugin so colocated `*.test.tsx`
  files aren't scanned as routes. Opened PR; awaiting CI + review.
