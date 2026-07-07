# Status: User-Settings Modal

**State:** Not started (2026-07-06). Blocked on `auth-backend-and-config` (needs
the session-read helper and Better Auth's sign-out/delete-user endpoints).
Independent of `sign-in-and-route-guard`, but sequenced after it.

- Branch: _not yet created_ (`authentication/user-settings-modal` when started).
- Sub-issue: [#30](https://github.com/nicbk/nicbk-website/issues/30)
  (parent [#27](https://github.com/nicbk/nicbk-website/issues/27)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Notes carried into implementation

- **Centered modal** (Base UI dialog) styled from tokens; account email
  **display only** (no editable fields — the mockup's "S3 Bucket URL" is a
  dropped placeholder).
- **Delete account** gated by an inline **type-to-match** confirmation (type the
  email; exact match enables the action) — **not** native `confirm()`. Keep the
  match predicate a pure, testable helper.
- **Log out** ends the session (clears the hardened cookie).
- **Accessibility:** focus trap + restore to trigger, keyboard-dismissible
  (Escape), accessible name; disabled→enabled transition of delete conveyed to AT.
- Build **reusable and test in isolation** — the live avatar trigger lives in
  the Lit-Tracker header and is wired in #7.
- **Delete removes only identity rows** — no user-owned sub-app tables exist
  until #7, so nothing downstream cascades yet.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `auth-backend-and-config`.
