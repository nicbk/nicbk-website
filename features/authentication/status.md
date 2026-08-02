# Status: Authentication

**Feature state:** In progress (2026-08-01). Task 1
(`auth-backend-and-config`) merged as
[#57](https://github.com/nicbk/nicbk-website/pull/57) and deployed; task 2
(`sign-in-and-route-guard`) merged as
[#59](https://github.com/nicbk/nicbk-website/pull/59); task 3
(`user-settings-modal`) implemented and awaiting PR + CI + review — the last
task in the feature. Depends on
[`app-shell-and-home`](../app-shell-and-home/status.md) (Complete) — extends its
app server, `src/env.ts` + `parseEnv`, and `docker-compose*.yml`, and reuses its
`(personal-site)` shell/header, design tokens, and theming. This is the
**phase transition** to a backend: the first feature to stand up Postgres,
Drizzle, and server-side sessions.

Feature parent issue:
[#27](https://github.com/nicbk/nicbk-website/issues/27); task sub-issues
[#28](https://github.com/nicbk/nicbk-website/issues/28)
(`auth-backend-and-config`),
[#29](https://github.com/nicbk/nicbk-website/issues/29)
(`sign-in-and-route-guard`), and
[#30](https://github.com/nicbk/nicbk-website/issues/30)
(`user-settings-modal`), linked as native sub-issues of #27.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `auth-backend-and-config` | Merged ([#28](https://github.com/nicbk/nicbk-website/issues/28)) | [#57](https://github.com/nicbk/nicbk-website/pull/57) | passed | merged |
| `sign-in-and-route-guard` | Merged ([#29](https://github.com/nicbk/nicbk-website/issues/29)) | [#59](https://github.com/nicbk/nicbk-website/pull/59) | passed | merged |
| `user-settings-modal` | Implemented ([#30](https://github.com/nicbk/nicbk-website/issues/30)) | pending | pending | pending |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met and each task
merged behind its own passing CI + human review. In short: a Postgres service +
Drizzle `pre_start` migrations stand up Better Auth's core schema; Better Auth
is mounted in-process (`/api/auth/*`) with the `tanstackStartCookies` plugin and
explicit cookie/session/CSRF hardening and the Google provider; `/sign-in`
completes the Google OAuth flow and redirects back to the originally-requested
URL, with an inline error on failure; a reusable route-guard redirects
signed-out users to `/sign-in`; and a reusable user-settings modal shows the
account email, logs out, and deletes the account behind a type-to-match
confirmation — all WCAG 2.2 AA in both themes, verified by unit + the new
integration tier (Testcontainers Postgres) + e2e (stubbed Google for the one
login-flow test, injected sessions elsewhere).

## Notes carried into implementation

- **`tanstackStartCookies` plugin is mandatory** — without it, cookies are
  silently never set under TanStack Start's SSR model (a "login doesn't persist"
  bug). Set cookie flags / `trustedOrigins` / session `maxAge` **explicitly**
  even where they match Better Auth defaults, so the posture is visible in code.
- **Drizzle is canonical**; migrations run via Compose `pre_start`; the first
  migration is purely additive (expand phase). `zero/schema.ts` generation is
  **deferred to #7** — this feature is Drizzle-only (Zero/Garage/GROBID are #7).
- **Account deletion has no downstream cascade yet** — no user-owned sub-app
  tables exist until #7, so deletion removes only the identity rows. The
  `ON DELETE CASCADE` ownership-FK convention is #7's responsibility as it adds
  each user-owned table.
- **Guard + modal ship reusable but not live-wired** — no protected route and no
  avatar trigger exist until #7. Only the sign-in flow is exercised end-to-end
  here. See [research.md](./research.md).
- **OAuth flow must be CSP-ready** (compatible with `form-action 'self'` /
  `frame-ancestors 'none'` / strict CSP) — the response-headers middleware
  itself is a separate, out-of-scope concern.
- **Env vars are server-only** (never `VITE_`-prefixed); provisioned manually
  on-host in a git-ignored `.env`; documented in the committed `.env.example`.
- **Google's real login UI is never automated** — the login-flow test asserts
  against stubbed OAuth endpoints only.

## Log

- 2026-07-06 — Feature spec'd as Phase 2, the first backend slice. Scoping
  confirmed with the user: guard/modal built reusable and isolation-tested (live
  wiring deferred to #7); sign-in rate limiting deferred; the general
  response-headers middleware kept a separate concern; three tasks
  (`auth-backend-and-config` → `sign-in-and-route-guard` → `user-settings-modal`).
  Awaiting implementation start.
- 2026-07-06 — GitHub issues filed: parent #27, sub-issues #28/#29/#30 linked
  under it as native sub-issues. All sub-issues unassigned; implementation left
  to another session.
- 2026-08-01 — Task 1 (`auth-backend-and-config`) implemented on
  `authentication/auth-backend-and-config` (#28 self-assigned): Postgres +
  Drizzle migrations, the generated Better Auth identity schema, Better Auth
  mounted at `/api/auth/*` with explicit cookie/session hardening, the required
  server-only environment, the session-read helper, and the new Testcontainers
  integration tier. Two implementation-time decisions worth review — a one-shot
  `migrate` service instead of Compose's `pre_start` (the installed Compose
  rejects `pre_start`), and snapshot/restore instead of transaction rollback for
  per-test isolation — are reasoned in the
  [task status](./tasks/auth-backend-and-config/status.md). Awaiting PR + CI +
  review.
- 2026-08-01 — **Google OAuth credentials deferred to task 2** (user decision):
  task 1 needs only well-formed values to boot, so local `.env` and the test
  harness carry placeholders; the real Google Cloud OAuth client is created
  before the sign-in page, which is the first thing that round-trips to Google.
- 2026-08-01 — Task 1 **merged as [#57](https://github.com/nicbk/nicbk-website/pull/57)**
  (CI green, approved) and deployed to nicbk-tower, with the production `.env`
  provisioned by hand beforehand (Postgres credentials, `DATABASE_URL`, a fresh
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://nicbk.com`, and placeholder
  Google credentials until task 2). Next: task 2, `sign-in-and-route-guard`.
- 2026-08-01 — Real Google OAuth credentials created and installed on
  nicbk-tower (Web application client; redirect URIs
  `https://nicbk.com/api/auth/callback/google` and the localhost equivalent; no
  authorized JavaScript origins, since the server-side authorization-code flow
  never sends the client id from the browser).
- 2026-08-01 — Task 2 (`sign-in-and-route-guard`) implemented on
  `authentication/sign-in-and-route-guard` (#29 self-assigned): the `/sign-in`
  page, the return-to sanitizer, the reusable guard, and the login-flow e2e
  against a stubbed Google. One deviation worth review — Better Auth hardcodes
  Google's token endpoint, so the decided mock-server-container mechanism was
  replaced with a browser-side `page.route()` stub plus an in-process `fetch`
  stub, recorded as a dated revision in
  [mocking-external-services.md](../../research/testing-qa/mocking-external-services.md)
  and reasoned in the [task status](./tasks/sign-in-and-route-guard/status.md).
  Awaiting PR + CI + review.
- 2026-08-01 — Task 2 **merged as [#59](https://github.com/nicbk/nicbk-website/pull/59)**
  (CI green, approved). Sign-in is live on the next deploy — the real Google
  credentials are already on nicbk-tower — though with no protected page yet,
  a successful sign-in returns the reader to `/`.
- 2026-08-01 — Task 3 (`user-settings-modal`) implemented on
  `authentication/user-settings-modal` (#30 self-assigned): the reusable
  `<UserSettings>` dialog, the type-to-match confirmation, `--color-error` in
  both palettes, `deleteUser` enabled server-side, and a gated test-only page
  that mounts the modal so it can be exercised in a browser before #7 supplies
  its avatar trigger. Three decisions were taken with the user beforehand (add
  the error token; keep delete-time session freshness and offer
  re-authentication; build the gated probe page). Browser verification found
  two bugs the whole test suite had missed — server-only modules leaking into
  the client bundle through an inline type import, and the destructive button
  losing its color to a `composes:` specificity tie — both fixed and locked in;
  the first is recorded as a dated revision in
  [import-conventions.md](../../research/coding-conventions/import-conventions.md)
  with an open question for the user. Awaiting PR + CI + review.
