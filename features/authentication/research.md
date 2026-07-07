# Research Traceability: Authentication

Every decision this feature implements traces to an already-decided
`research/*.md` doc or a `high-level-guidance/design/*` artifact. No decision is
improvised here; the few narrow, feature-local choices (scope calls the research
left open — rate limiting, the response-headers boundary, how to make the
guard/modal demoable without a consumer) are recorded in the "Notes" section
below rather than left implicit — per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md).

## High-level design

- [../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md)
  — open-source-only, with **Google Auth as the one stated permitted
  exception**; shared self-hosted infrastructure. This is the origin of the
  Better Auth + Google decision.

## Auth provider and session hardening

- [../../research/technologies/auth.md](../../research/technologies/auth.md)
  — **Better Auth** (MIT, library not service), configured with **Google** as
  the social/OAuth provider, keeping identity data in the same shared Postgres.
- [../../research/security-privacy/session-and-auth-hardening.md](../../research/security-privacy/session-and-auth-hardening.md)
  — explicit cookie flags (`httpOnly`/`secure`/`sameSite:'lax'`), an explicit
  `trustedOrigins` list, an explicit session `maxAge`/rotation window, **no
  separate CSRF library** (Better Auth's Origin/Referer + Fetch-Metadata checks
  suffice), and the **mandatory `tanstackStartCookies` plugin** (without it
  cookies are silently never set under TanStack Start).
- [../../research/security-privacy/index.md](../../research/security-privacy/index.md)
  — the category boundary: provider choice lives in `technologies/auth.md`,
  isolation in `data-sharing-boundaries.md`, TLS in `hosting-and-infrastructure.md`.

## Where auth runs / identity data model

- [../../research/system-architecture/service-topology.md](../../research/system-architecture/service-topology.md)
  — the TanStack Start app server hosts Better Auth's routes **in-process** as a
  catch-all (`/api/auth/*`), not a separate service; single-node topology.
- [../../research/system-architecture/data-sharing-boundaries.md](../../research/system-architecture/data-sharing-boundaries.md)
  — **only identity is shared** across sub-apps: Better Auth's
  `user`/`session`/`account`/`verification` tables. Everything else is
  sub-app- then user-scoped via a `user_id` FK, enforced in the app server's
  `/query`/`/mutate` handlers (not a separate permissions layer). This is why
  the feature ships only the identity schema and no sub-app tables.
- [../../research/data-modeling/zero-schema-conventions.md](../../research/data-modeling/zero-schema-conventions.md)
  — user-owned tables reference `user` via an **`ON DELETE CASCADE`** ownership
  FK (preferred over a Better Auth `databaseHooks.user.delete` hook), which is
  what makes account deletion remove a user's data. No such tables exist yet
  (see Notes) — this convention is what deletion in #7+ will rely on.
- [../../research/data-modeling/index.md](../../research/data-modeling/index.md)
  — reiterates the `user_id`-FK pattern and records the **avoided Better Auth
  social-login-hook** approach to per-user seeding (a pitfall to remember for
  any post-signup side effects).

## Database, ORM, and migrations

- [../../research/technologies/database.md](../../research/technologies/database.md)
  — **PostgreSQL v18+**, one shared instance backing all sub-apps; `wal_level`
  set for the later Zero subscription.
- [../../research/technologies/orm.md](../../research/technologies/orm.md)
  — **Drizzle ORM + Drizzle Kit** own Postgres DDL; the Drizzle schema
  (`src/db/schema.ts`) is the canonical data-shape source; `zero/schema.ts` is
  generated via `drizzle-zero` (deferred to #7 here — see Notes).
- [../../research/devops-deployment/database-migrations.md](../../research/devops-deployment/database-migrations.md)
  — migrations run via Compose's native **`pre_start`** step before the app
  container starts; **expand/contract discipline mandatory** given the
  revert-code-not-schema rollback model.

## Deployment, hosting, secrets

- [../../research/devops-deployment/hosting-and-infrastructure.md](../../research/devops-deployment/hosting-and-infrastructure.md)
  — one Docker Compose stack on the NixOS node, Caddy terminating TLS in front;
  site live at `https://nicbk.com` (so `BETTER_AUTH_URL` and Google redirect
  URIs must match it). The **EC2-relay masquerade** means the app sees every
  public client as the relay IP — no real client IPs, hence no meaningful
  IP-based rate limiting at the node (see Notes).
- [../../research/devops-deployment/secrets-and-environment-config.md](../../research/devops-deployment/secrets-and-environment-config.md)
  — `BETTER_AUTH_SECRET` (throws at startup if unset in prod), `BETTER_AUTH_URL`
  set explicitly, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `DATABASE_URL`:
  server-only, **never `VITE_`-prefixed**; provisioned manually on-host in a
  git-ignored `.env` (repo is public, so no committed ciphertext); local dev via
  `.env.local` with the committed `.env.example` template. CI needs zero
  GitHub-side secrets.
- [../../research/devops-deployment/containerization-and-build.md](../../research/devops-deployment/containerization-and-build.md)
  — the new Postgres service uses an official image pinned to a version tag; the
  app server keeps its multi-stage Dockerfile and `.output/server/index.mjs`
  entry point.

## Sign-in / account UI

- [../../research/ui-ux/pages/site-wide/pages/sign-in.md](../../research/ui-ux/pages/site-wide/pages/sign-in.md)
  — the `/sign-in` page: site header, a short "why sign in" line, a "sign in
  with Google" button, redirect back to the originally-requested URL, inline
  error on failure/cancellation; shared across every sub-app that needs auth.
- [../../research/ui-ux/pages/site-wide/components/user-settings.md](../../research/ui-ux/pages/site-wide/components/user-settings.md)
  — the centered account-settings **modal**: email display-only, log out, delete
  account with a **type-to-match** confirmation (not native `confirm()`),
  triggered from an avatar/icon.
- [../../research/ui-ux/pages/index.md](../../research/ui-ux/pages/index.md)
  — **access-denied handling**: no interstitial page — a signed-out user hitting
  a protected URL is redirected straight to `/sign-in`. Also the **header
  split** (the site header carries no auth UI) and generic-error-fallback
  existence.
- [../../research/ui-ux/pages/site-wide/index.md](../../research/ui-ux/pages/site-wide/index.md)
  — confirms sign-in and user-settings are site-wide auth/account surfaces
  shared by any sub-app, not owned by the Lit Tracker.
- [../../research/ui-ux/pages/site-wide/components/header.md](../../research/ui-ux/pages/site-wide/components/header.md)
  — **no auth UI in the personal-site header**; auth lives inside sub-apps that
  need it (the boundary that makes the guard/trigger have no live consumer here).
- [../../research/ui-ux/design-system.md](../../research/ui-ux/design-system.md)
  — CSS Modules from global tokens, Base UI primitives (the modal), JetBrains
  Mono, light/dark theming, Lucide icons; the **inline-form-error** reactive
  pattern the sign-in page and the delete-confirmation use (not a toast).

## Layout, conventions, and code style

- [../../research/coding-conventions/file-hierarchy-and-complexity.md](../../research/coding-conventions/file-hierarchy-and-complexity.md)
  — where `src/db/` (Drizzle schema + migrations), the auth server config, and
  the route-guard utility live relative to `src/` and the existing `src/env.ts`.
- [../../research/coding-conventions/state-management-conventions.md](../../research/coding-conventions/state-management-conventions.md)
  — the redirect-target (which URL sent the user to sign-in) is carried in the
  URL, not transient local state; server session is the source of auth truth.
- [../../research/coding-conventions/styling-conventions.md](../../research/coding-conventions/styling-conventions.md),
  [../../research/coding-conventions/naming-and-casing.md](../../research/coding-conventions/naming-and-casing.md),
  [../../research/coding-conventions/component-and-export-conventions.md](../../research/coding-conventions/component-and-export-conventions.md),
  [../../research/coding-conventions/typescript-conventions.md](../../research/coding-conventions/typescript-conventions.md),
  [../../research/coding-conventions/import-conventions.md](../../research/coding-conventions/import-conventions.md)
  — 1:1 component-to-`.module.css`, kebab-case files, named exports,
  function-declaration components, `strict` TS, import grouping — matching the
  home/about/blog precedent.

## Security headers (boundary reference)

- [../../research/security-privacy/app-security-headers.md](../../research/security-privacy/app-security-headers.md)
  — the CSP-nonce/HSTS/`frame-ancestors`/`Referrer-Policy`/`Permissions-Policy`
  middleware. **Out of scope for this feature** (see Notes); referenced so the
  OAuth flow is built compatible with the eventual strict CSP / `form-action
  'self'` / `frame-ancestors 'none'` posture.

## Accessibility

- [../../research/accessibility/conformance-target.md](../../research/accessibility/conformance-target.md)
  — WCAG 2.2 AA, site-wide.
- [../../research/accessibility/color-contrast-and-focus-visibility.md](../../research/accessibility/color-contrast-and-focus-visibility.md),
  [../../research/accessibility/keyboard-and-focus-management.md](../../research/accessibility/keyboard-and-focus-management.md),
  [../../research/accessibility/semantic-markup-and-aria-conventions.md](../../research/accessibility/semantic-markup-and-aria-conventions.md)
  — contrast/focus visibility, **modal focus trap and restore**, keyboard
  dismissal, accessible names/pressed-state on the Google button and the modal's
  controls, focus handoff to the page heading.

## Testing

- [../../research/testing-qa/test-runner-and-frameworks.md](../../research/testing-qa/test-runner-and-frameworks.md)
  — Vitest + Testing Library; pure-function tests for the guard and the
  confirmation-match predicate; the env-schema tests.
- [../../research/testing-qa/integration-testing-strategy.md](../../research/testing-qa/integration-testing-strategy.md)
  — the **integration tier this feature introduces**: Testcontainers Postgres,
  Drizzle's real migrations once per suite, transaction-rollback per test.
- [../../research/testing-qa/mocking-external-services.md](../../research/testing-qa/mocking-external-services.md)
  — **OAuth stubbing**: session injection for most tests; the single login-flow
  e2e stubs Google's `/authorize`·`/token`·`/userinfo` via WireMock/MockServer
  (Google's real UI blocks automation); MSW for in-process unit HTTP.
- [../../research/testing-qa/e2e-testing.md](../../research/testing-qa/e2e-testing.md)
  — Playwright against the full compose stack; the `auth.setup.ts`
  `storageState` setup-project pattern for injected sessions; the flagged
  Start+Playwright timing caveat applies to the post-sign-in redirect.
- [../../research/testing-qa/test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md),
  [../../research/testing-qa/accessibility-testing.md](../../research/testing-qa/accessibility-testing.md),
  [../../research/accessibility/testing-and-tooling.md](../../research/accessibility/testing-and-tooling.md)
  — ratchet coverage; `@axe-core/playwright` inline on `/sign-in` and the open
  modal in both themes.

## Project-management process

- [../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md)
  — the feature/task folder structure and per-task PR gating.
- [../../research/project-management-conventions/issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md)
  — GitHub Issues + native sub-issues; self-assign to claim; PR closing keywords.
- [../../research/project-management-conventions/commit-message-conventions.md](../../research/project-management-conventions/commit-message-conventions.md)
  — Conventional Commits on PR titles.

## Notes / narrower research (feature-local, not global)

- **Demoable without a consumer (user decision, 2026-07-06).** The route-guard
  and the settings-modal *trigger* have no live consumer until #7 (the site
  header carries no auth UI; no protected personal-site route exists). Rather
  than invent a throwaway protected route that #7 would immediately replace,
  the guard and the modal are built as **reusable, unit/integration-tested
  units**, and only the **sign-in flow itself** is exercised end-to-end here.
  Their first live wiring (a protected Lit-Tracker route; the Lit-Tracker
  header's avatar trigger) happens in #7. This is a scoping call within the
  already-decided access-denied/header-split behavior, not a new UX decision.
- **Zero / `zero/schema.ts` deferred to #7.** The roadmap introduces
  Zero/Garage/GROBID with #7; Better Auth validates sessions server-side through
  Drizzle and needs none of them. Generating the `drizzle-zero` projection of
  the identity schema before Zero exists (and before any table is actually
  synced) would be premature, so this feature is **Drizzle-only** and leaves
  `zero/schema.ts` to the feature that first stands up `zero-cache`.
- **Account deletion has no downstream cascade yet.** The `ON DELETE CASCADE`
  ownership-FK convention (`zero-schema-conventions.md`) is what makes deleting
  a `user` row remove that user's content — but no user-owned sub-app tables
  exist until #7, so deletion in this feature removes only the identity rows
  (`user` and its `session`/`account`). Recorded so the implementation doesn't
  assume (or test for) a cascade into tables that don't exist yet, and so #7
  knows the cascade wiring is its responsibility as it adds each user-owned
  table.
- **Sign-in rate limiting / bot protection deferred (user decision).** No
  research decides this. Google-only sign-in has no password endpoint to
  brute-force, and the relay masquerade
  ([hosting-and-infrastructure.md](../../research/devops-deployment/hosting-and-infrastructure.md))
  removes real client IPs, so IP-based limiting is moot at the node. Explicitly
  out of scope; revisit if a real abuse surface appears.
- **Response-headers middleware kept separate (user decision).** The general
  CSP/HSTS/etc. middleware from `app-security-headers.md` is a cross-cutting
  hardening concern not built yet and not blocking auth. This feature only
  configures Better Auth's own cookie/CSRF hardening and **verifies the OAuth
  flow is compatible** with the eventual strict CSP / `form-action 'self'` /
  `frame-ancestors 'none'` posture, so that middleware can be added later
  without breaking sign-in.
- **Email verification is N/A.** Google verifies the account email; there is no
  email/password flow. Better Auth's `verification` table ships as part of the
  core schema (it is created regardless of plugins) but no verification feature
  is built on it here.
