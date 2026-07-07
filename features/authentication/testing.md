# Testing: Authentication

Testing requirements for the feature as a whole, per the decided testing tiers
(see [research.md](./research.md) for citations). Each task's `testing.md`
states the concrete tests that task must add.

## Tiers in play

Unlike the Phase-1 static features, this feature has a **database and a session
backend**, so the **integration tier applies for the first time**: a real
Postgres via **Testcontainers** (`@testcontainers/postgresql`), Drizzle's real
migrations run once at suite start, transaction-rollback per test, per
[integration-testing-strategy.md](../../research/testing-qa/integration-testing-strategy.md).
Coverage is unit + integration + e2e + inline accessibility.

**External-service stubbing** follows
[mocking-external-services.md](../../research/testing-qa/mocking-external-services.md):
most auth-requiring tests **inject a valid Better Auth session directly** (as a
cookie / Playwright `storageState`), skipping the OAuth dance; the **single
login-flow e2e** stubs Google's `/authorize`·`/token`·`/userinfo` via a
WireMock/MockServer container in the e2e stack — Google's real login UI can't
be driven in CI. Unit tests use **MSW** for any HTTP the code under test makes
in-process.

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Env schema** (`src/env.ts`): the new required variables (`DATABASE_URL`,
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`) fail `parseEnv` with a clear per-variable error when
  missing/malformed, and parse when present (exercising the existing
  `parseEnv` success/failure paths against an auth-shaped schema).
- **Route-guard utility:** given a signed-out context it produces a redirect to
  `/sign-in` carrying the originally-requested URL; given a signed-in context
  it permits the route. Tested as a pure function over an injected
  session/context — no live route required.
- **Sign-in page** renders the explanatory line and the "sign in with Google"
  button with a discernible accessible name; an injected error state renders
  the inline error message (not a toast).
- **User-settings modal** renders the account email (display only); the "delete
  account" action stays disabled until the confirmation field's text **exactly
  matches** the required prompt, then enables; "log out" and the confirmed
  delete invoke the expected handlers. Focus is trapped and restored; the modal
  is keyboard-dismissible.
- Any non-trivial pure helper (redirect-target encoding/decoding, the
  confirmation-match predicate) is unit-tested directly.

## Integration (Vitest + Testcontainers Postgres)

- **Session lifecycle:** against a real Postgres with Better Auth's migrated
  schema, a session can be created and read back; the session cookie carries
  the hardened attributes (`httpOnly`, `secure` in prod config, `sameSite=lax`)
  and the configured `maxAge`.
- **Migrations:** Drizzle's real migration files apply cleanly to a fresh
  Testcontainers Postgres, producing the `user`/`session`/`account`/
  `verification` tables (the suite-start migration step the other integration
  tests build on).
- **Log out** invalidates the session server-side (a subsequent read with the
  old session is unauthenticated).
- **Delete account** removes the identity rows for the user; a session for the
  deleted user no longer resolves. (No sub-app tables exist yet, so nothing
  downstream cascades — see [research.md](./research.md).)
- **`trustedOrigins` / CSRF:** a mutation request with a disallowed Origin is
  rejected by Better Auth's built-in Origin/Fetch-Metadata protection; an
  allowed origin is accepted — verifying no separate CSRF library is needed.

## End-to-end (Playwright)

- **Login flow (the one stubbed-Google test):** with Google's OAuth endpoints
  stubbed via the mock-server container, clicking "sign in with Google" on
  `/sign-in` completes the round-trip, sets the session cookie, and **redirects
  back to the originally-requested URL** carried into the flow.
- **Sign-in error:** a stubbed failed/cancelled Google response renders the
  inline error on `/sign-in` (no toast), and no session cookie is set.
- **Settings actions (injected session):** with a session injected via
  `storageState`, the user-settings modal shows the account email; "log out"
  ends the session; the "delete account" type-to-confirm flow only fires after
  the exact-match confirmation.
- **Metadata:** `/sign-in` exposes the expected document `<title>` and
  `meta name="description"`.
- **Theming:** no flash of the wrong theme; `/sign-in` and the modal are
  correct in both themes.

## Accessibility

- `@axe-core/playwright` runs inline on `/sign-in` and on the open
  user-settings modal in both themes, blocking on critical/serious findings.
- The Google button, the modal's actions, and the confirmation field have
  discernible accessible names and are keyboard operable; the modal traps and
  restores focus and is dismissible by keyboard; contrast and focus indicators
  meet AA in both themes; heading structure is valid.

## Coverage / gating

- Vitest `v8` coverage, ratchet-style (must not drop PR-over-PR), per
  [test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md).
  The integration tier participates in the same suite/gate.

## Framework caveats to carry

- The same flagged **TanStack Start + Playwright** hydration/routing-timing
  flakiness as the earlier features: assert on settled DOM/URL state, don't
  race hydration or the post-sign-in redirect.
- **Google's real login UI is never driven** — the login-flow test asserts
  against the stubbed OAuth endpoints only; automating Google's real sign-in is
  actively blocked and out of scope.
