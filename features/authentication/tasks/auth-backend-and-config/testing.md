# Testing: Auth Backend and Config

This task **introduces the integration tier** (Testcontainers Postgres), per
[integration-testing-strategy.md](../../../../research/testing-qa/integration-testing-strategy.md).

## Unit (Vitest)

- **Env schema:** each new required variable (`DATABASE_URL`,
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`) missing/malformed fails `parseEnv` with a clear
  per-variable error; a complete auth-shaped env parses. Exercises the existing
  `parseEnv` success/failure paths without mutating real `process.env`.
- **Better Auth config:** the constructed options carry the explicit hardened
  cookie attributes (`httpOnly`, `secure` under a production env, `sameSite=lax`),
  a non-empty `trustedOrigins`, an explicit session `maxAge`, the Google
  provider, and the `tanstackStartCookies` plugin — asserted against the config
  object so the intended posture is regression-guarded.

## Integration (Vitest + Testcontainers Postgres)

- **Migrations apply:** Drizzle's real migration files apply cleanly to a fresh
  Testcontainers Postgres, producing the `user`/`session`/`account`/
  `verification` tables (the suite-start migration the other integration tests
  build on).
- **Session lifecycle:** a session can be created via Better Auth against the
  real Postgres and read back through the session-read helper; the session
  cookie carries the hardened attributes and configured `maxAge`.
- **Origin/CSRF:** a mutation with a disallowed Origin is rejected by Better
  Auth's built-in protection; an allowed origin is accepted (verifying no
  separate CSRF library is required).
- Per-test isolation via **transaction-rollback**, not full reset/reseed.

## Not tested here

- Any auth **UI** — the `/sign-in` page, the Google button, the route-guard
  against a route (task 2), and the settings modal (task 3).
- The end-to-end **login flow** with stubbed Google (task 2's e2e).
- Account **deletion** semantics beyond schema existence (task 3 / feature-level).
