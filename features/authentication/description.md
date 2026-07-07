# Feature: Authentication

The site's first **backend** slice: signing in with Google. This is the
**phase transition** from a purely static personal site (Phase 1) to an
application with a database and server-side sessions — the same way
[`app-shell-and-home`](../app-shell-and-home/description.md) carried the
frontend bring-up, this feature carries the backend bring-up that all of the
Lit Tracker (Phase 3) later depends on.

The user-visible slice is small and self-contained: a visitor goes to
`/sign-in`, signs in with Google, and gets a hardened session backed by
Postgres; a signed-in user can open an account-settings surface to see their
email, log out, or delete their account. Everything under it — Postgres,
Drizzle, Better Auth — is the infrastructure that first appears here because
this is the first feature that needs it (per the roadmap's
infra-rides-inside-the-first-feature-that-needs-it rule).

Concretely, this feature produces:

- The **backend stack bring-up**: a **Postgres** service in
  `docker-compose.yml`, **Drizzle + Drizzle Kit** owning Postgres DDL with
  migrations run via Compose's native `pre_start` step, and the new required
  environment variables (`DATABASE_URL`, `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) added to the
  existing `src/env.ts` Zod schema and the committed `.env.example`.
- **Better Auth mounted in-process** in the TanStack Start server as a
  catch-all `/api/auth/*` route (not a separate service), configured with the
  **Google** social/OAuth provider, the **mandatory `tanstackStartCookies`
  plugin**, and explicit session/cookie/CSRF hardening — and its core schema
  (`user`, `session`, `account`, `verification`) defined and migrated through
  the Drizzle pipeline.
- The **sign-in page** at `/sign-in`: a minimal standalone page with a "sign
  in with Google" button, an inline error on failure/cancellation, and a
  post-sign-in redirect back to whatever URL the user originally came from.
- A **reusable route-guard utility** that redirects a signed-out user to
  `/sign-in` (no interstitial "access denied" page), built and tested here so
  the Lit Tracker's protected routes can reuse it unchanged.
- The **user-settings modal**: a centered modal showing the signed-in Google
  account email (display only), with "log out" and a "delete account" action
  guarded by a type-to-match confirmation.

This is the first feature to stand up a database, the first to add server-side
session state, and the first to depend on an external identity provider.

## Scope boundary

This feature stands up **only identity**. The Zero sync engine, Garage blob
storage, and GROBID — and the `zero/schema.ts` generation that `drizzle-zero`
produces from the Drizzle schema — are **not** introduced here; they arrive
with [`article-upload-and-extraction`](../../features/index.md) (#7), the first
feature that actually syncs reactive data. Better Auth validates sessions
server-side through Drizzle directly and needs none of them.

The sign-in page and the user-settings modal are **site-wide auth/account
surfaces shared by any sub-application that needs them**, not owned by the Lit
Tracker (per
[`research/ui-ux/pages/site-wide/index.md`](../../research/ui-ux/pages/site-wide/index.md)).
This feature **originates** them; the Lit Tracker (#7) is their first real
consumer.

## No live consumer yet (deliberate)

The personal site itself has **no auth** — its header carries no sign-in or
avatar UI (see
[`research/ui-ux/pages/site-wide/components/header.md`](../../research/ui-ux/pages/site-wide/components/header.md)),
and there are no protected personal-site routes. The natural consumers of the
route-guard and the settings-modal *trigger* — protected Lit-Tracker routes and
the Lit-Tracker header's avatar — do not exist until #7.

So this feature builds the route-guard utility and the user-settings modal as
**reusable, fully unit/integration-tested units, but does not wire them to a
live protected route or a live avatar trigger** — that first real wiring
happens in #7. What *is* exercised end-to-end here is the sign-in flow itself
(`/sign-in` → Google OAuth → session cookie → log out / delete account against
the real Better Auth + Postgres backend). This keeps the slice honest and
demoable without inventing a throwaway protected route that #7 would immediately
replace.
