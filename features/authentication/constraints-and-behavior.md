# Constraints and Behavior: Authentication

Acceptance criteria for the feature as a whole. Each task's own
`constraints-and-behavior.md` states which of these it satisfies.

## Backend, schema, and configuration

- A **Postgres** service (official image, pinned version tag — not `latest`,
  not a digest) is added to `docker-compose.yml`, running identically under
  `docker compose up` locally and in production, per
  [hosting-and-infrastructure.md](../../research/devops-deployment/hosting-and-infrastructure.md).
  Postgres is **v18+** with `wal_level` set for the later Zero subscription,
  per [database.md](../../research/technologies/database.md).
- **Drizzle + Drizzle Kit** own actual Postgres DDL; the canonical data-shape
  source is the Drizzle schema (`src/db/schema.ts`). Migrations run as a
  Compose **`pre_start`** init step that completes before the app container
  starts, per
  [database-migrations.md](../../research/devops-deployment/database-migrations.md).
  Migrations follow **expand/contract** discipline (rollback reverts code, not
  schema).
- Better Auth's **core schema** — `user`, `session`, `account`, `verification`
  — is defined and migrated through this Drizzle pipeline (it is the identity
  data shared across all future sub-apps, per
  [data-sharing-boundaries.md](../../research/system-architecture/data-sharing-boundaries.md)).
- New environment variables — `DATABASE_URL`, `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — are declared
  as **required** in `src/env.ts`'s Zod schema (so startup fails fast with a
  clear error when one is missing) and documented in the committed
  `.env.example`. They are **server-only**: never `VITE_`-prefixed (which would
  leak them into the client bundle), per
  [secrets-and-environment-config.md](../../research/devops-deployment/secrets-and-environment-config.md).

## Better Auth mount and session hardening

- Better Auth is mounted **in-process** in the TanStack Start server as a
  catch-all route (e.g. `/api/auth/*`), not run as a separate service, per
  [service-topology.md](../../research/system-architecture/service-topology.md).
- The **`tanstackStartCookies` Better Auth plugin is enabled** — this is a
  correctness requirement, not optional: without it, TanStack Start's
  server-function model never gives Better Auth response-object access and
  cookies are silently never set, per
  [session-and-auth-hardening.md](../../research/security-privacy/session-and-auth-hardening.md).
- **Cookies** are set **explicitly** (even where they match Better Auth's
  defaults, so the posture is visible in code): `httpOnly: true`,
  `secure: true` in production, `sameSite: 'lax'`.
- An explicit **`trustedOrigins`** list names every origin allowed to complete
  an auth flow (rather than relying only on `baseURL`), and an explicit session
  **`maxAge` / rotation window** is chosen deliberately rather than inherited
  silently.
- **CSRF** protection is Better Auth's own Origin/Referer validation against
  `trustedOrigins` plus its Fetch-Metadata (`Sec-Fetch-*`) checks — **no
  separate CSRF-token library** is added (that would duplicate protection the
  framework already provides).
- **Google** is the configured social/OAuth provider; the OAuth redirect URIs
  registered with Google and `BETTER_AUTH_URL` match the deployed origin
  (`https://nicbk.com`) in production and the local dev callback in
  development, per
  [hosting-and-infrastructure.md](../../research/devops-deployment/hosting-and-infrastructure.md).

## Sign-in page (`/sign-in`)

- A minimal standalone page rendering inside the **site header**: a short
  explanatory line of why sign-in is needed and a **"sign in with Google"**
  button, per
  [sign-in.md](../../research/ui-ux/pages/site-wide/pages/sign-in.md).
- **Post-sign-in redirect** returns the user to whatever protected URL they
  originally tried to access (carried through the flow), **not** a fixed
  destination — keeping the page agnostic to which sub-application sent them.
- If Google sign-in **fails or is cancelled**, the error is shown as an
  **inline message on this same page** (consistent with the inline-form-error
  convention in
  [design-system.md](../../research/ui-ux/design-system.md)'s reactive-feedback
  patterns), not a toast.

## Route guard (reusable)

- A reusable guard redirects a **signed-out** user who reaches a protected URL
  **straight to `/sign-in`** — there is **no separate "access denied"
  interstitial page**, per
  [`research/ui-ux/pages/index.md`](../../research/ui-ux/pages/index.md).
- The guard preserves the originally-requested URL so the sign-in page can
  redirect back to it.
- The guard is built and tested as a **reusable utility**; because no protected
  route exists in this feature, its first attachment to a live route happens in
  #7 (Lit Tracker). This feature verifies it in isolation, not against a live
  personal-site route.

## User-settings modal

- A **centered modal** (same pattern as the settings mockup), showing the
  signed-in Google account **email, display only** — no editable fields, per
  [user-settings.md](../../research/ui-ux/pages/site-wide/components/user-settings.md).
- A **"log out"** action ends the session (clearing the hardened cookie).
- A **"delete account"** action requires an inline confirmation where the user
  must **type text that exactly matches a given prompt** (e.g. their email)
  before the destructive action is enabled/submitted — **not** a native browser
  `confirm()`.
- The modal is built as a **reusable component**; its live **avatar/icon
  trigger** lives in the (future) Lit-Tracker header and is wired in #7. This
  feature builds and tests the modal in isolation.

## Metadata

- The `/sign-in` route sets its own document `<title>` and
  `meta name="description"` via the route `head()` + the existing
  `<HeadContent />` in `__root.tsx`. Open Graph is not required for an
  auth-gated utility page.

## Cross-cutting quality

- WCAG 2.2 AA, site-wide target: 4.5:1 text / 3:1 non-text contrast in both
  themes, visible focus indicators on every control (the Google button, the
  modal's actions and confirmation field), accessible names on all controls,
  valid heading structure with a main heading the shell's client-navigation
  focus handoff can target; the modal traps and restores focus and is
  dismissible by keyboard.
- Correct in both light and dark themes, with no flash of the wrong theme.
- The OAuth flow and auth redirects are verified **compatible with a strict CSP
  / `frame-ancestors 'none'` / `form-action 'self'`** posture, so the
  separately-scoped response-headers middleware (below) can be added later
  without breaking sign-in.
- Runs identically via `npm run dev` and the production Nitro server
  (`npm run build && npm run start`) and under `docker compose up` with the
  Postgres service and the `pre_start` migration.
- CI (Biome, typecheck incl. CSS-Module codegen, unit + integration tests with
  ratchet coverage, Playwright e2e + axe, PR-title lint) passes.

## Explicitly out of scope

- **Zero / Garage / GROBID and `zero/schema.ts` generation** — deferred to #7;
  Better Auth needs none of them (see [description.md](./description.md)).
- **A live protected route and a live avatar trigger** — no consumer exists
  until #7; the guard and the modal ship reusable and isolation-tested.
- **The general response-headers middleware** (CSP nonce, HSTS,
  `X-Content-Type-Options`, `frame-ancestors`, `Referrer-Policy`,
  `Permissions-Policy`) from
  [app-security-headers.md](../../research/security-privacy/app-security-headers.md)
  — a separate cross-cutting hardening concern (not built yet, not blocking
  auth). This feature only configures Better Auth's own cookie/CSRF hardening
  and verifies the OAuth flow is CSP-ready.
- **Sign-in rate limiting / bot protection** — Google-only sign-in has no
  password endpoint to brute-force, and the EC2 relay masquerade means the app
  sees every public client as the relay's IP (no real client IPs for IP-based
  limiting), per
  [hosting-and-infrastructure.md](../../research/devops-deployment/hosting-and-infrastructure.md).
  Low value now; revisit if a real abuse surface appears.
- **Email verification** — Google verifies the email; there is no
  email/password flow. Better Auth's `verification` table ships as part of the
  core schema but no verification *feature* is built on it.
- **Any Lit-Tracker data** (articles, annotations, jobs) and the `user_id`-FK
  `ON DELETE CASCADE` chains that make account deletion remove a user's
  content — none of those tables exist yet, so deletion here removes only the
  identity rows (see the note in [research.md](./research.md)).
