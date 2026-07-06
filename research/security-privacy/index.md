# Research: Security & Privacy

Status: fully researched and decided (2026-07-05), 5/5.

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
