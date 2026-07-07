# Status: Error and Not-Found Pages

**Feature state:** Spec'd, not yet started (2026-07-06). Folder written and
tasks defined; no task implemented yet. Depends on
[`app-shell-and-home`](../app-shell-and-home/status.md) (Complete) — extracts
`SiteShell` from its `(personal-site)/route.tsx` and fills the
`notFoundComponent`/`errorComponent` placeholders it left in `__root.tsx`.

Feature parent issue:
[#20](https://github.com/nicbk/nicbk-website/issues/20); task sub-issues
[#21](https://github.com/nicbk/nicbk-website/issues/21)
(`site-shell-and-not-found`) and
[#22](https://github.com/nicbk/nicbk-website/issues/22) (`error-fallback`),
linked as native sub-issues of #20.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `site-shell-and-not-found` | Implemented, in review ([#21](https://github.com/nicbk/nicbk-website/issues/21)) | open | pending | pending |
| `error-fallback` | Not started ([#22](https://github.com/nicbk/nicbk-website/issues/22)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met and each
task merged behind its own passing CI + human review. In short: both the 404
and error-fallback pages render inside the real site header (via a shared
`SiteShell`, with the personal-site layout refactored onto it and unchanged
in output), in both themes at WCAG 2.2 AA; the 404 returns a real HTTP 404
status; the error page surfaces optional technical detail behind a collapsed
disclosure and cannot itself throw.

## Notes carried into implementation

- **Verify the HTTP 404 status** against TanStack Start's actual behavior —
  do not assume the framework returns 404 rather than 200 for a not-found
  render (see [research.md](./research.md)).
- **`SiteShell` refactor must be output-neutral** for the personal-site
  layout — a regression test guards that the header/`<main>` are unchanged.

## Log

- 2026-07-06 — Feature spec'd on merit as the cleanest next Phase-1 slice
  (small, no forward dependencies, closes the placeholder-fallback gap). Two
  tasks defined: `site-shell-and-not-found` then `error-fallback`. Awaiting
  implementation start.
- 2026-07-06 — GitHub issues filed: parent #20, sub-issues #21/#22 linked
  under it. Both sub-issues unassigned; implementation left to another
  session.
