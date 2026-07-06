# Session & Auth Hardening

Researched: 2026-07-05. Decided: 2026-07-05.

Security-relevant configuration on top of the already-decided auth provider
([../technologies/auth.md](../technologies/auth.md) — Better Auth, Google as
the social/OAuth provider): cookie flags, session expiry/rotation, and CSRF
protection for TanStack Start's server-function mutation endpoints.

## Decision

- **Cookies: `httpOnly: true`, `secure: true` in production, `sameSite:
  'lax'`**, set explicitly in the Better Auth config rather than left to
  its (already-matching) defaults, so the intent is visible in code and not
  just inherited silently.
- **An explicit `trustedOrigins` list**, rather than relying only on
  `baseURL`, naming every origin (including any sub-app paths) allowed to
  complete an auth flow.
- **An explicit session `maxAge`/rotation window**, chosen deliberately
  rather than accepted unexamined from the library default.
- **No separate CSRF token library.** Better Auth's own Origin/Referer
  validation against `trustedOrigins`, plus its Fetch Metadata
  (`Sec-Fetch-Site`/`Mode`/`Dest`) checks for the pre-session-cookie case,
  is the CSRF protection for server-function mutation calls — this is
  sufficient and adding a second CSRF mechanism would be redundant.
- **The `tanstackStartCookies` Better Auth plugin is required**, not
  optional — TanStack Start's server functions don't give Better Auth
  direct response-object access the way an Express-style framework would,
  so without this plugin cookies are silently never set.

## Reasoning

- Setting cookie flags and `trustedOrigins` explicitly, even where they
  match Better Auth's defaults, follows
  [AGENTS.md](../../AGENTS.md)'s "Code readability and documentation"
  principle: a future reader should see the security posture in the config
  itself, not have to know the library's default behavior by heart.
- Relying on Better Auth's built-in CSRF mechanism instead of layering on a
  token-based library avoids duplicating protection the framework already
  provides — directly following
  [AGENTS.md](../../AGENTS.md)'s "Avoid duplication" guidance.
- The `tanstackStartCookies` plugin isn't a hardening choice so much as a
  correctness requirement specific to this stack's SSR model — recorded
  here because it's easy to silently omit and only surfaces as a confusing
  "login doesn't persist" bug later.

## Sources

- [Security | Better Auth](https://better-auth.com/docs/reference/security) —
  cookie defaults and Origin/Fetch-Metadata CSRF protection.
- [Cookies | Better Auth](https://better-auth.com/docs/concepts/cookies) —
  cookie configuration options (`secure`, `sameSite`, `httpOnly`).
- [TanStack Start Integration | Better Auth](https://better-auth.com/docs/integrations/tanstack) —
  the `tanstackStartCookies` plugin requirement.
- [Options | Better Auth](https://better-auth.com/docs/reference/options) —
  `trustedOrigins` and session `maxAge`/rotation configuration.
- [Authentication | TanStack Start React Docs](https://tanstack.com/start/latest/docs/framework/react/guide/authentication) —
  TanStack Start's server-function auth model.
