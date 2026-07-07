# Status: Site Shell + Not-Found Page

**State:** Not started (2026-07-06).

- Branch: _not yet created_ (`error-and-not-found/site-shell-and-not-found`
  when started).
- Sub-issue: [#21](https://github.com/nicbk/nicbk-website/issues/21)
  (parent [#20](https://github.com/nicbk/nicbk-website/issues/20)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Notes carried into implementation

- The `(personal-site)/route.tsx` refactor onto `SiteShell` must be
  output-neutral (regression-tested); keep the header/`<main>`/skip-link/
  focus-handoff behavior identical.
- Verify TanStack Start's real not-found HTTP status and set 404 explicitly
  if it defaults to 200.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started.
