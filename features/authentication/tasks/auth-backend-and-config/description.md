# Task: Auth Backend and Config

Stand up the backend and configure Better Auth so a hardened, Postgres-backed
session can be created and validated **server-side, with no auth UI yet**. This
is the walking skeleton the sign-in page and the settings modal build on, and
the first database/server-state slice in the whole project.

## What this task does — concretely

- **Postgres service.** Add a **Postgres** service (official image, pinned
  version tag) to `docker-compose.yml` (and the local `docker-compose.override.yml`
  as needed), Postgres **v18+** with `wal_level` set for the later Zero
  subscription. It runs identically under `docker compose up` locally and in
  production, per
  [hosting-and-infrastructure.md](../../../../research/devops-deployment/hosting-and-infrastructure.md).
- **Drizzle + migrations.** Add **Drizzle ORM + Drizzle Kit**; establish
  `src/db/schema.ts` as the canonical schema and a `src/db` client module.
  Wire migrations to run as a Compose **`pre_start`** init step that completes
  before the app container starts, per
  [database-migrations.md](../../../../research/devops-deployment/database-migrations.md),
  following expand/contract discipline (this first migration is purely additive).
- **Better Auth core schema.** Define Better Auth's `user`/`session`/`account`/
  `verification` tables in the Drizzle schema and generate the initial migration
  for them — this is the identity data shared across all future sub-apps, per
  [data-sharing-boundaries.md](../../../../research/system-architecture/data-sharing-boundaries.md).
- **Better Auth mount + hardening.** Instantiate Better Auth (server config
  module, e.g. `src/auth/`) with:
  - the **Drizzle adapter** over the shared Postgres,
  - the **Google** social/OAuth provider,
  - the **mandatory `tanstackStartCookies` plugin**,
  - explicit **cookies** (`httpOnly: true`, `secure: true` in production,
    `sameSite: 'lax'`), an explicit **`trustedOrigins`** list, and an explicit
    session **`maxAge`/rotation** window,
  - **no** separate CSRF library (rely on Better Auth's Origin/Fetch-Metadata
    protection),

  and mount it **in-process** as a catch-all route (e.g.
  `src/routes/api/auth/$.ts` → `/api/auth/*`), per
  [service-topology.md](../../../../research/system-architecture/service-topology.md)
  and
  [session-and-auth-hardening.md](../../../../research/security-privacy/session-and-auth-hardening.md).
- **Environment.** Extend the existing `src/env.ts` Zod schema with the new
  **required** variables — `DATABASE_URL`, `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — so a missing
  one fails at startup with a clear error (the existing `parseEnv` mechanism),
  and document each in the committed `.env.example`. All server-only; **never
  `VITE_`-prefixed**, per
  [secrets-and-environment-config.md](../../../../research/devops-deployment/secrets-and-environment-config.md).
- **Session helper.** Provide a small server-side helper to read the
  authenticated session from a request (the thing the route-guard in task 2 and
  the settings modal in task 3 consume).

## Not in this task

- The `/sign-in` **page**, the "sign in with Google" button, and the reusable
  **route-guard** (task 2).
- The **user-settings modal** (task 3).
- **Zero / `zero/schema.ts` generation, Garage, GROBID** — deferred to #7; this
  task is Drizzle-only.
- The general **response-headers middleware**, **rate limiting**, and **email
  verification** — out of scope for the whole feature (see the feature's
  [constraints-and-behavior.md](../../constraints-and-behavior.md)).
