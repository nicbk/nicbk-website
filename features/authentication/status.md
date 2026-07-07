# Status: Authentication

**Feature state:** Spec'd, not yet started (2026-07-06). Folder written and
tasks defined; no task implemented yet. Depends on
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
| `auth-backend-and-config` | Not started ([#28](https://github.com/nicbk/nicbk-website/issues/28)) | — | — | — |
| `sign-in-and-route-guard` | Not started ([#29](https://github.com/nicbk/nicbk-website/issues/29)) | — | — | — |
| `user-settings-modal` | Not started ([#30](https://github.com/nicbk/nicbk-website/issues/30)) | — | — | — |

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
