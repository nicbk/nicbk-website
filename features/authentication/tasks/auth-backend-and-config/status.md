# Status: Auth Backend and Config

**State:** Not started (2026-07-06). First of three; no blockers beyond
[`app-shell-and-home`](../../../app-shell-and-home/status.md) (Complete).

- Branch: _not yet created_ (`authentication/auth-backend-and-config` when
  started).
- Sub-issue: [#28](https://github.com/nicbk/nicbk-website/issues/28)
  (parent [#27](https://github.com/nicbk/nicbk-website/issues/27)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Notes carried into implementation

- **Postgres v18+**, official image pinned to a version tag; `wal_level` set for
  the later Zero subscription; runs identically local/prod.
- **Drizzle canonical** (`src/db/schema.ts`); migrations via Compose
  **`pre_start`**; this first migration is additive (expand phase).
- **`tanstackStartCookies` plugin mandatory**; set cookie flags /
  `trustedOrigins` / session `maxAge` **explicitly** even where matching
  defaults.
- Mount Better Auth **in-process** at `/api/auth/*` (catch-all route); Drizzle
  adapter over the shared Postgres; Google provider; **no** separate CSRF library.
- Extend the **existing** `src/env.ts` schema with the new **required** vars and
  document them in `.env.example`; server-only, never `VITE_`-prefixed;
  `BETTER_AUTH_URL` + Google redirect URIs match `https://nicbk.com` / local
  callback.
- Provide the **server-side session-read helper** tasks 2 and 3 consume.
- This task **introduces the integration tier** (Testcontainers Postgres,
  Drizzle migrations once per suite, transaction-rollback per test).

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; first of three.
