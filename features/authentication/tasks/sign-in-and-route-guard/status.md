# Status: Sign-in Page and Route Guard

**State:** Not started (2026-07-06). Blocked on `auth-backend-and-config` (needs
the Better Auth instance, the `/api/auth/*` mount, and the server-side
session-read helper).

- Branch: _not yet created_ (`authentication/sign-in-and-route-guard` when
  started).
- Sub-issue: [#29](https://github.com/nicbk/nicbk-website/issues/29)
  (parent [#27](https://github.com/nicbk/nicbk-website/issues/27)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Notes carried into implementation

- `/sign-in` renders in the site header: "why sign in" line + "sign in with
  Google" button + inline error on failure/cancellation (not a toast) + per-page
  `head()`.
- **Redirect back** to the originally-requested URL carried into the flow;
  validate it is a **same-origin app path** (no open redirect).
- The **reusable route-guard** redirects signed-out users to `/sign-in` with the
  current URL preserved (no interstitial). Ship it as a tested utility — **do
  not** attach it to a live protected route (none exists until #7).
- **Login-flow e2e** stubs Google's `/authorize`·`/token`·`/userinfo` via the
  mock-server container; Google's real UI is never automated.
- Carry the flagged Start+Playwright timing caveat — assert on the settled
  post-sign-in redirect, don't race hydration.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `auth-backend-and-config`.
