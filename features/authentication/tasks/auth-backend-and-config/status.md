# Status: Auth Backend and Config

**State:** Merged (2026-08-01). First of three; built on `main` at `6a32d58`.

- Branch: `authentication/auth-backend-and-config`.
- Sub-issue: [#28](https://github.com/nicbk/nicbk-website/issues/28)
  (parent [#27](https://github.com/nicbk/nicbk-website/issues/27)),
  self-assigned.
- PR: [#57](https://github.com/nicbk/nicbk-website/pull/57) — CI green,
  approved, merged, and deployed to nicbk-tower.

## Notes carried into implementation

- **Postgres v18+**, official image pinned to a version tag; `wal_level` set for
  the later Zero subscription; runs identically local/prod.
- **Drizzle canonical** (`src/db/schema.ts`); migrations before the app starts;
  this first migration is additive (expand phase).
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
  Drizzle migrations once per suite).

## What was implemented

- **Postgres service** (`docker-compose.yml`): `postgres:18.4`, started with
  `wal_level=logical`, credentials interpolated from the git-ignored `.env`, a
  `pg_isready` healthcheck the app waits on, and a named volume for its data.
- **Drizzle + migrations.** `src/db/create-database.ts` (factory) and
  `src/db/client.ts` (the app's singleton pool); `drizzle.config.ts`; the first
  migration (`src/db/migrations/0000_better_auth_identity_tables.sql`), purely
  additive.
- **Better Auth core schema** — `user` / `session` / `account` / `verification`,
  with `ON DELETE CASCADE` from the two user-owned identity tables — generated
  from the auth config rather than hand-written
  (`scripts/gen-auth-schema.mjs`, `npm run db:generate-schema`) and guarded by a
  **CI drift check**, the same derive-don't-hand-type rule the GPG artifacts
  follow.
- **Better Auth mount + hardening.** `src/auth/create-auth.ts` (factory) and
  `src/auth/auth.ts` (the app's instance): Drizzle adapter over the shared
  Postgres, Google as the only provider, `tanstackStartCookies()` last in the
  plugin array, explicit `httpOnly` / `secure` / `sameSite: lax` cookie
  attributes, an explicit `trustedOrigins`, and a 7-day session refreshed at
  most daily. Mounted in-process at `src/routes/api/auth/$.ts` → `/api/auth/*`.
- **Environment.** `src/env.ts` gains five required, server-only variables,
  each documented in `.env.example` along with the Compose-only Postgres
  credentials.
- **Session helper.** `src/auth/session.ts` (`getSessionFrom`) plus a
  `getSession` bound to the app instance — what task 2's route guard and task
  3's settings modal consume.
- **Integration tier** (new): `vitest.integration.config.ts`,
  `src/db/test-support/test-database.ts` (Testcontainers Postgres, real
  migrations, snapshot/restore isolation), `npm run test:integration`, and its
  own CI job.

## Decisions taken at implementation time

- **A one-shot `migrate` service instead of Compose's `pre_start` hook.** The
  decided mechanism
  ([database-migrations.md](../../../../research/devops-deployment/database-migrations.md))
  was `pre_start`, but the installed Compose (v5.0.2) rejects it outright:
  `services.app additional properties 'pre_start' not allowed`. The app now
  depends on a one-shot `migrate` service with
  `condition: service_completed_successfully` — supported across every Compose
  2.x–5.x, with the identical guarantee (migrations complete, or the app never
  starts). Recorded as a dated revision in that research doc; **worth a look at
  review**, since going back to `pre_start` means requiring a newer Compose on
  the deploy host.
- **Required environment everywhere, with explicit placeholders in the test
  harness** (user decision, 2026-08-01). `playwright.config.ts` and
  `vitest.setup.ts` supply obviously-fake values so the unit and e2e tiers keep
  running without a database; neither tier signs in or connects.
- **Snapshot/restore rather than transaction-rollback for per-test isolation.**
  The integration-testing research suggests wrapping each test in a rolled-back
  transaction, which cannot work here: the code under test takes its own
  connections from its own pool and would never join that transaction.
  Testcontainers' database snapshot gives the same isolation for code that
  manages its own connections. Reasoned in `test-database.ts`.
- **Postgres 18 volume path.** The data volume mounts at
  `/var/lib/postgresql`, not the `/var/lib/postgresql/data` path older images
  used: 18+ puts its data directory in a versioned subdirectory and refuses to
  start against the old mount point. Found by running the stack — the container
  came up unhealthy and blocked the app.

## Verification

- Biome ✓, `npm run typecheck` ✓, **175 unit tests** ✓ (9 new, covering the
  environment schema: every required variable named on omission, a too-short
  secret and a non-Postgres URL rejected, and no variable `VITE_`-prefixed).
- **5 integration tests** ✓ against real Postgres 18.4 via Testcontainers, the
  real committed migrations, and Better Auth's real HTTP surface with only
  Google's token endpoint stubbed: the authorize redirect carries this app's
  client ID and callback URI; sign-in creates the `user`/`account`/`session`
  rows; the session cookie carries `HttpOnly`, `Secure`, `SameSite=Lax` and the
  configured max-age; the session reads back from that cookie; an absent or
  tampered cookie yields none. Checked to be non-vacuous — flipping `sameSite`
  to `strict` in the config fails the hardening test.
- **52 Playwright e2e** ✓ against the production build (suite unchanged; the
  server now boots with the required environment supplied by the config).
- **The real stack, both ways.** `docker compose -f docker-compose.yml up -d`:
  db healthy → `migrate` applied the migration and exited 0 → app started; `/`
  returns 200, `/api/auth/ok` returns 200, `/api/auth/get-session` returns
  `null` without a cookie, `POST /api/auth/sign-in/social` returns a real
  `accounts.google.com` authorize URL with PKCE and the correct `redirect_uri`,
  and `show wal_level` reports `logical`. Plain `docker compose up`: same
  sequence from the dev image, migrations applied out of the bind-mounted
  checkout. `npm run dev` on the host also picks up `.env` and serves the auth
  routes.

## Not in this task

No UI: the `/sign-in` page and route guard are task 2, the settings modal task
3. Nothing signs a real user in yet — the Google credentials in the local
`.env` are placeholders until then, per the user's decision.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; first of three.
- 2026-08-01 — Implemented on `authentication/auth-backend-and-config` (#28
  self-assigned), after a research pass confirming current versions and APIs
  (better-auth 1.6.25, its Drizzle adapter now a separate package, `npx auth
  generate` as the CLI, and the `server.handlers` route API already present in
  the installed TanStack Start). Full gate green plus the live Compose stack
  end to end. Awaiting PR + CI + review.
- 2026-08-01 — **Merged as [#57](https://github.com/nicbk/nicbk-website/pull/57)**
  and deployed. The production `.env` was provisioned on the host first, since
  the stack now refuses to start without it.
