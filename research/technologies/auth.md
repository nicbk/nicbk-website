# Auth

Researched: 2026-07-02. Decided: 2026-07-02.

## Decision

**Better Auth**, configured with Google as the social/OAuth provider,
chosen over running a standalone open-source IdP (Keycloak/Authentik/
Authelia/Pocket ID). As a library rather than a separate service, it keeps
auth data in the same shared Postgres database as everything else, and
satisfies the "Google Auth is the allowed exception" clause in
[DESIGN.md](../../high-level-guidance/design/DESIGN.md) while keeping the
rest of the auth stack open source and self-hosted.

Google Auth is the stated allowed exception to the open-source-only
constraint (see [DESIGN.md](../../high-level-guidance/design/DESIGN.md)).
Researched both a library to integrate Google sign-in and open-source
standalone identity-provider alternatives, for completeness.

## Library approach: Better Auth

- MIT licensed, framework-agnostic TypeScript auth framework; same code
  works across Next.js, TanStack Start, Express, etc.
- Supports Google as a social/OAuth provider alongside others (GitHub,
  etc.), configured directly in the auth setup.
- Since it's a library rather than a hosted service, it fits well with the
  "shared infrastructure" constraint — auth data lives in the same shared
  Postgres database as everything else rather than a separate service.
- This looks like the best fit: it lets the project use Google Auth (the
  permitted exception) while keeping the rest of the auth stack (session
  storage, user table, etc.) open source and self-hosted in the shared DB.

## Standalone open-source identity-provider alternatives (if a separate service is wanted later)

- **Keycloak** — most mature/enterprise-grade, but heavy and
  resource-intensive to run for a personal project.
- **Authentik** — modern, policy-driven, visual auth-flow builder; covers
  OIDC/OAuth2/SAML/LDAP/SCIM/passkeys via a single Docker Compose.
- **Ory Hydra** — OAuth2/OIDC server only (not a full user/group-managing
  IdP); part of the modular Ory ecosystem.
- **Authelia** — single ~26 MB Go binary, 50-100 MB RAM, handles
  OIDC/OAuth2; lightweight.
- **Pocket ID** — ultra-lightweight, passkey-first OIDC provider, single
  container, ~256 MB idle.

## Recommendation signal from research

Given this project is a personal site with a small number of sub-apps
sharing one backend, a full standalone IdP (Keycloak/Authentik) is likely
more operational overhead than needed. **Better Auth** as a library,
configured with the Google provider, appears to satisfy both the "Google
Auth is the allowed exception" clause and the general preference for
shared, self-hosted infrastructure.

## Sources

- [Comparing Top Open-Source Auth Libraries in 2026](https://www.better-stack.ai/p/blog/open-source-auth-libraries-in-2026)
- [GitHub - better-auth/better-auth](https://github.com/better-auth/better-auth)
- [Open Source Authentication in 2026: Complete Comparison](https://skycloak.io/blog/open-source-authentication-comparison-2026/)
- [Authelia vs Authentik in 2026](https://www.cerbos.dev/blog/authelia-vs-authentik-2026-idp)
- [Best Self-Hosted SSO Platforms Compared: Authgear vs Keycloak vs Authentik](https://www.authgear.com/post/best-self-hosted-sso-platforms-compared-authgear-vs-keycloak-vs-authentik/)
