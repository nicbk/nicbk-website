# Status: Error-Fallback Page

**State:** Not started (2026-07-06). Blocked on `site-shell-and-not-found`
(needs `SiteShell` and the established root-fallback wiring pattern).

- Branch: _not yet created_ (`error-and-not-found/error-fallback` when
  started).
- Sub-issue: [#22](https://github.com/nicbk/nicbk-website/issues/22)
  (parent [#20](https://github.com/nicbk/nicbk-website/issues/20)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Notes carried into implementation

- Render defensively: `error.message`/`error.stack` may be
  missing/undefined; an error with no message must still yield a valid page.
- Keep the fallback body free of anything that could re-throw inside the
  error boundary.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `site-shell-and-not-found`.
