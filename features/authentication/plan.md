# Plan: Authentication

## Approach

Stand up the backend and prove authentication works **server-side first**,
before any auth UI exists; then build the **sign-in page** (the one surface
that exercises the whole OAuth flow end-to-end) plus the reusable route-guard;
then build the **user-settings modal**. Each stage is independently
testable/mergeable behind its own PR + CI + human review before the next
begins.

The backend comes first for the same reason the blog's pipeline task came
before its pages: it is the riskiest, most cross-cutting part (a new Postgres
service, the migration mechanism, Better Auth's in-process mount, the
`tanstackStartCookies` correctness requirement, Google OAuth credentials) and
is worth isolating and verifying — via integration tests that inject a session
directly — on its own, before any page depends on it. Once the backend can
create and validate a hardened session, the sign-in page is "just" the UI that
drives Better Auth's Google flow, and the settings modal is "just" the UI over
its session/log-out/delete endpoints.

## Task breakdown and sequence

Tasks are sequential — one open at a time, each gated by its own PR + CI +
human review.

1. **[`auth-backend-and-config`](./tasks/auth-backend-and-config/description.md)**
   — The backend bring-up. Add the Postgres service to `docker-compose.yml`;
   set up Drizzle + Drizzle Kit and the `pre_start` migration step; define and
   migrate Better Auth's core schema (`user`/`session`/`account`/`verification`)
   through Drizzle; mount Better Auth in-process at `/api/auth/*` with the
   Google provider, the `tanstackStartCookies` plugin, and explicit
   cookie/session/CSRF hardening; extend `src/env.ts` + `.env.example` with the
   new required variables. Exit state: an integration test (Testcontainers
   Postgres) can create a session via Better Auth and read it back with the
   hardened cookie attributes — no UI yet.

2. **[`sign-in-and-route-guard`](./tasks/sign-in-and-route-guard/description.md)**
   — The `/sign-in` page (site header, a short "why sign in" line, a "sign in
   with Google" button, an inline error on failure/cancellation, and a
   redirect back to the originally-requested URL) plus a **reusable route-guard
   utility** that redirects a signed-out user straight to `/sign-in`. The
   sign-in flow gets the single end-to-end login test (Google's OAuth endpoints
   stubbed — the real Google UI can't be driven in CI). The guard is
   unit/integration-tested; it is **not** attached to a live protected route
   here (no such route exists until #7).

3. **[`user-settings-modal`](./tasks/user-settings-modal/description.md)**
   — The centered account-settings modal: signed-in Google account email
   (display only), a "log out" action, and a "delete account" action gated by a
   type-to-match confirmation (type the account email to enable the destructive
   action — not a native `confirm()`). Built as a reusable component with its
   log-out/delete wired to the real Better Auth endpoints and covered by
   component + integration tests with an injected session; its **live avatar
   trigger** is deferred to the Lit-Tracker header in #7.

## Sequencing rationale

- **Backend first** so every later task builds on a proven, hardened session
  backend rather than a mock, and so the single riskiest, most cross-cutting
  piece (new service + migrations + Better Auth mount + OAuth credentials) is
  isolated in its own reviewable task and verified by integration tests before
  any UI exists.
- **Sign-in before settings** because the sign-in page is what actually
  exercises the full OAuth round-trip end-to-end; getting it green (with the
  stubbed-Google login test) establishes the real session that the settings
  modal's log-out/delete actions then operate on. It also keeps the reusable
  route-guard — the thing #7's protected routes inherit — in the same task as
  the redirect-to-sign-in destination it targets.
- **Settings last** because it is a pure consumer of an existing session: it
  reads the session's email and calls Better Auth's log-out/delete endpoints,
  with no new backend surface of its own beyond what task 1 already provides.

## What this feature deliberately does not introduce

- **Zero / Garage / GROBID and `zero/schema.ts`** — deferred to #7; Better Auth
  needs none of them, and generating a Zero projection of the identity schema
  before Zero exists would be premature.
- **A live protected route or a live avatar trigger** — no consumer exists
  until #7; the guard and the modal are built reusable and tested in isolation
  (see [description.md](./description.md)).
- **The general response-headers middleware** (CSP/HSTS/etc.), **sign-in rate
  limiting**, and **email verification** — see the "Explicitly out of scope"
  section of [constraints-and-behavior.md](./constraints-and-behavior.md) for
  the rationale on each.
