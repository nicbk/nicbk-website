# Status: Sign-in Page and Route Guard

**State:** Implemented (2026-08-01); awaiting PR + CI + review. Unblocked by
`auth-backend-and-config`, which merged as
[#57](https://github.com/nicbk/nicbk-website/pull/57).

- Branch: `authentication/sign-in-and-route-guard`.
- Sub-issue: [#29](https://github.com/nicbk/nicbk-website/issues/29)
  (parent [#27](https://github.com/nicbk/nicbk-website/issues/27)); self-assigned.
- PR / CI / review: _pending._

## What was built

- **`/sign-in`** (`src/routes/sign-in/`) at the route root rather than inside
  `(personal-site)`: the page is site-wide, shared by every sub-application that
  needs auth, so it renders `SiteShell` itself the way the root-level 404 and
  error pages do. Zod `validateSearch` over `returnTo` + `error`, a per-page
  `head()`, and a colocated `-sign-in-page/` component + CSS Module.
- **`src/auth/return-to.ts`** — `sanitizeReturnTo`, the open-redirect boundary:
  same-origin app paths only, rejecting absolute, protocol-relative,
  backslash-disguised, and non-hierarchical URLs, preserving query and fragment.
- **`src/auth/require-auth.ts`** — `requireSession` (pure: session + requested
  location → session, or a thrown redirect to `/sign-in` carrying the sanitized
  destination) and `requireAuth`, the `beforeLoad`-shaped wrapper. Not attached
  to any route; #7 supplies the first live use.
- **`src/auth/fetch-session.ts`** — the `createServerFn` that resolves the
  session on the server for a guard running in either environment.
- **`src/auth/auth-client.ts`** — the Better Auth React client, origin-relative.
- **Error handling** — the page passes `errorCallbackURL: '/sign-in'`, so Better
  Auth's `redirectOnError` returns failures as `?error=<code>`; the page renders
  one inline message, distinguishing only `access_denied` ("cancelled") from
  everything else.

## Implementation-time decisions worth review

- **How Google is stubbed for the e2e** deviates from
  [mocking-external-services.md](../../../../research/testing-qa/mocking-external-services.md)'s
  mock-server container, because Better Auth hardcodes the token endpoint and
  refuses redirects on it. `/authorize` is stubbed with Playwright
  `page.route()` (it's a browser navigation), `/token` with an `--import`
  preload inside the app server process, and `/userinfo` not at all (never
  called). Recorded as a dated revision in that file; the substance — stub
  Google, never automate its UI — is unchanged.
- **A second Playwright tier.** The flow needs a real database, so
  `playwright.auth.config.ts` + `scripts/e2e-auth-server.mjs` +
  `npm run test:e2e:auth` run it against a Testcontainers Postgres with the
  committed migrations applied, in its own CI job — mirroring the split the
  integration tier already has. `/sign-in` as a *page* stays in the ordinary
  suite (`e2e/sign-in.spec.ts`), which needs no database.
- **The inline error is styled neutrally** (left rule + full-strength text), not
  red: the palette has no error token, and inventing one is a design-system
  decision rather than this task's. Worth deciding before the settings modal
  (task 3) adds a second inline-error surface.
- **The title keeps the site name** (`Sign in · Nicolás Kennedy`) where blog
  posts title themselves alone — sign-in is where a user most needs to know
  whose site is asking for their Google account.

## Verification

- Unit: 47 tests across the return-to helper, the guard, the search schema, the
  error mapping, and the page (including that an off-site `returnTo` never
  reaches Better Auth).
- Sign-in flow e2e: the full round trip signs in, sets an `HttpOnly` session
  cookie, and lands on the carried destination; a cancelled flow renders the
  inline error and sets no cookie. Proved non-vacuous by tightening the token
  stub's required fields — the success test then failed with `error=invalid_code`.
- Page e2e: metadata, both themes with no wrong-theme flash, no overflow at
  360px, axe (critical/serious) in both themes with the error showing.
- Browser: viewed at 320–1440px in both themes (no overflow at any width), focus
  ring confirmed on the button, and the client-side failure path exercised for
  real — with no database running, the request fails, the button re-enables, and
  the inline error appears.

## Notes carried into implementation

- `/sign-in` renders in the site header: "why sign in" line + "sign in with
  Google" button + inline error on failure/cancellation (not a toast) + per-page
  `head()`.
- **Redirect back** to the originally-requested URL carried into the flow;
  validate it is a **same-origin app path** (no open redirect).
- The **reusable route-guard** redirects signed-out users to `/sign-in` with the
  current URL preserved (no interstitial). Ship it as a tested utility — **do
  not** attach it to a live protected route (none exists until #7).
- **Login-flow e2e** stubs Google's endpoints; Google's real UI is never
  automated.
- Carry the flagged Start+Playwright timing caveat — assert on the settled
  post-sign-in redirect, don't race hydration.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `auth-backend-and-config`.
- 2026-08-01 — Researched the Google-stubbing question against the installed
  Better Auth (1.6.25) and upstream issues; confirmed the decided mechanism is
  not implementable and agreed the substitute with the user, who also chose to
  build the login-flow e2e now rather than defer it to #7.
- 2026-08-01 — Implemented on `authentication/sign-in-and-route-guard` (#29
  self-assigned). Awaiting PR + CI + review.
