# Constraints and Behavior: Auth Backend and Config

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md) — the
"Backend, schema, and configuration" and "Better Auth mount and session
hardening" sections, plus the relevant cross-cutting quality bar):

## Backend and schema

- A pinned-tag **Postgres v18+** service exists in `docker-compose.yml`, runs
  identically locally and in production, with `wal_level` set for the later Zero
  subscription.
- **Drizzle + Drizzle Kit** own DDL; `src/db/schema.ts` is canonical. Migrations
  run via Compose's **`pre_start`** step, completing before the app container
  starts. This first migration is additive (expand phase).
- Better Auth's `user`/`session`/`account`/`verification` tables are created by
  the migration on a fresh database.

## Configuration and mount

- Better Auth is mounted **in-process** at `/api/auth/*` (catch-all route), not a
  separate service, using the Drizzle adapter over the shared Postgres and the
  Google provider.
- The **`tanstackStartCookies` plugin is enabled** (cookies are actually set —
  the correctness requirement this stack silently fails without).
- Cookies are set **explicitly** (`httpOnly: true`, `secure: true` in
  production, `sameSite: 'lax'`); `trustedOrigins` and session `maxAge`/rotation
  are set **explicitly** rather than inherited; no separate CSRF library is
  added.
- `src/env.ts` requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; a missing/malformed one fails at
  startup with a clear per-variable error. Each is documented in `.env.example`
  and is server-only (never `VITE_`-prefixed). `BETTER_AUTH_URL` and the Google
  redirect URIs match `https://nicbk.com` (prod) / the local dev callback.

## Behavior (verified without UI)

- Against a real Postgres with the migrated schema, a **session can be created
  and read back**; the emitted cookie carries the hardened attributes and the
  configured `maxAge`.
- A mutation request with a **disallowed Origin** is rejected by Better Auth's
  built-in Origin/Fetch-Metadata protection; an **allowed** origin is accepted.
- The server-side **session-read helper** returns the authenticated session for
  a valid session and an unauthenticated result otherwise.

## Cross-cutting quality

- Runs identically via `npm run dev`, the production Nitro server, and
  `docker compose up` (with the Postgres service and the `pre_start` migration).
- CI passes: Biome, typecheck, unit + the new **integration tier** (Testcontainers
  Postgres), ratchet coverage.

## Dependencies

- The app server, `src/env.ts` + `parseEnv`, and `docker-compose*.yml` from
  [`app-shell-and-home`](../../../app-shell-and-home/description.md) (extended,
  not rebuilt).
- New: Better Auth, Drizzle ORM + Drizzle Kit, a Postgres driver, and
  `@testcontainers/postgresql` (dev).

## Provides to later tasks

- The Better Auth instance + `/api/auth/*` mount, the Drizzle schema/client,
  and the **server-side session-read helper** — consumed by
  `sign-in-and-route-guard` (task 2) and `user-settings-modal` (task 3).
