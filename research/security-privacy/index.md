# Research: Security & Privacy

Status: 5/5 decided (2026-07-05); 3 more researched 2026-10-14 and mostly
answered by the user on 2026-11-12 (see
[decisions.md](../requests/2026-10-14/decisions.md)); round-2 follow-ups
researched 2026-11-12, awaiting the user.

Auth/session handling, data protection for uploaded PDFs/annotations, the
GPG signing/encryption capability mentioned on the about page, and
application-level security hardening (CI scanning, response headers) not
already settled by the technology/architecture/deployment decisions this
category builds on.

Boundary notes: the auth *provider* choice (Better Auth + Google OAuth) is
decided in [../technologies/auth.md](../technologies/auth.md), not here;
multi-tenant data isolation is decided in
[../system-architecture/data-sharing-boundaries.md](../system-architecture/data-sharing-boundaries.md),
not here; TLS/HTTPS is decided in
[../devops-deployment/hosting-and-infrastructure.md](../devops-deployment/hosting-and-infrastructure.md),
not here. This category resolves the CI security-scanning tool choice
explicitly deferred by
[../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md).

## Topics

- [session-and-auth-hardening.md](./session-and-auth-hardening.md) —
  Decided. Explicit cookie flags/`trustedOrigins`/session rotation on top
  of Better Auth's defaults; its built-in Origin/Fetch-Metadata CSRF
  protection, no separate CSRF library; the `tanstackStartCookies` plugin
  required for TanStack Start.
- [pdf-and-annotation-data-protection.md](./pdf-and-annotation-data-protection.md) —
  Decided. Host-level LUKS at rest (Garage has no native SSE for standard
  S3 calls); all PDF reads/writes proxied through the app server rather
  than presigned Garage URLs, reusing the existing `user_id`-ownership
  check.
- [ci-security-scanning-tool.md](./ci-security-scanning-tool.md) —
  Decided. Gitleaks (secrets) + Semgrep OSS (SAST) + `npm audit`
  (dependency CVEs); Trivy not adopted, given its flagged supply-chain
  incident and lower relevance to this project's risk surface; all
  third-party Actions pinned by commit SHA.
- [gpg-key-publishing.md](./gpg-key-publishing.md) — Decided. Self-hosted
  Web Key Directory (WKD) as the primary mechanism, plus a static `.asc`
  download link for humans; the about page's displayed fingerprint is
  derived from the same source key, not hand-typed separately.
- [app-security-headers.md](./app-security-headers.md) — Decided. HSTS at
  Caddy; CSP (via TanStack Start's built-in nonce support) and the
  remaining headers via a small hand-rolled middleware, not Helmet; a
  strict `style-src 'self'` is achievable given the already-decided
  Shiki/`rehype-pretty-code` output uses data attributes, not inline
  styles.
- [user-data-encryption.md](./user-data-encryption.md) — Researched
  2026-10-14; decided 2026-11-12: "zero-access" encryption, option (d)
  (server processes uploads transiently, stores everything encrypted to the
  user's public key). The round-1 options, key hierarchy and migration plan.
- [user-data-encryption-round-2.md](./user-data-encryption-round-2.md) —
  Researched 2026-11-12; awaiting the user's round-2 answers. What stays
  plaintext under Zero (E4: ids, timestamps and statuses; all content
  sealed, one column per write unit; citation linking moves to the browser),
  and what re-processing with consent needs (E7).
- [user-data-encryption-2fa-and-recovery.md](./user-data-encryption-2fa-and-recovery.md) —
  Researched 2026-11-12; awaiting the user's round-2 answers (E6). The
  recovery code stays mandatory even with 2FA; passkey-first optional 2FA,
  where one gesture signs in and unlocks; TOTP deferred because Better
  Auth's `twoFactor` does not cover Google sign-ins.
- [operator-liability-and-policies.md](./operator-liability-and-policies.md) —
  Researched 2026-10-14; mostly decided 2026-11-12. Research, not legal
  advice: no-sharing plus legal hygiene (DMCA agent, Terms, Privacy Policy,
  abuse contact, NCMEC registration) protects the operator; encryption adds
  little legally.
- [operator-liability-and-policies-round-2.md](./operator-liability-and-policies-round-2.md) —
  Researched 2026-11-12; awaiting the user's round-2 answers. Research, not
  legal advice: no upload scanning at launch (NCMEC registration, a Pathways
  application, a hook for later); the DMCA and CSAM runbooks; the public
  address (corrects round 1: only the agent's address may be a P.O. box); and
  whether an LLC makes sense (it depends on the state of residence).
- [production-hardening.md](./production-hardening.md) — Researched
  2026-10-14; awaiting decision. Two live defects (shared rate-limit bucket
  behind the relay; account deletion leaves PDFs in Garage), plus a
  MUST/SHOULD hardening list for public launch.
