# Status: Error-Fallback Page

**State:** Implemented, in review (2026-07-06). All local gates green
(typecheck, Biome, 45 unit tests, 15 e2e against the production build).

- Branch: `error-and-not-found/error-fallback`.
- Sub-issue: [#22](https://github.com/nicbk/nicbk-website/issues/22)
  (parent [#20](https://github.com/nicbk/nicbk-website/issues/20)); self-assigned.
- PR / CI / review: _pending_ (opening after review).

## Notes carried into implementation

- Render defensively: `error.message`/`error.stack` may be
  missing/undefined; an error with no message must still yield a valid page.
- Keep the fallback body free of anything that could re-throw inside the
  error boundary.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `site-shell-and-not-found`.
- 2026-07-06 — Implemented. Added the designed `ErrorPage`
  (`src/routes/-shared/components/error-page/`): plain-text lowercase
  "something went wrong" + a home `<Link>`, matching the 404's tone, with the
  error message and stack surfaced behind a **collapsed native `<details>`
  disclosure** (hidden by default; native so it needs no JS, is
  keyboard-operable, conveys its state to AT, and cannot itself throw). The
  body is defensive — it reads only the error's message/stack strings and
  guards both as possibly empty/undefined, omitting the disclosure entirely
  when neither is present. Wired it into the root `errorComponent`
  (`__root.tsx`), replacing the bare-`<main>` placeholder.
- 2026-07-06 — **Discovered** that the root `errorComponent` *replaces*
  `RootComponent` (document shell included), unlike `notFoundComponent` which
  renders into its `<Outlet/>`. Axe on the error page initially failed
  (missing `<title>`/`lang`); fixed by having `RootErrorFallback` render the
  shared `RootDocument` shell itself (`<HeadContent/>`, skip link, `<Scripts/>`)
  — no duplication of the shell markup. Axe passes in both themes after the fix.
- 2026-07-06 — Added a **test-only** forced-throw route
  (`src/routes/error-probe.tsx`) gated by the `VITE_E2E_ERROR_PROBE` flag,
  which only the Playwright webServer sets (`playwright.config.ts`). Production
  builds never carry the flag, so `/error-probe` is inert there (renders the
  normal 404 and cannot be made to throw). E2e asserts the fallback renders
  inside the header, the disclosure is collapsed then expands, and axe passes
  (critical/serious) in both themes. Awaiting PR + CI + review.
