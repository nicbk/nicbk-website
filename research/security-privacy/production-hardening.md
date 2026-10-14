# Production Hardening

Researched: 2026-10-14. Decided: not yet — awaiting the user.

What else a small, solo-operated, home-hosted app needs before it serves the
general public. Answers **P6** of
[data-privacy-and-hardening.md](../requests/2026-10-14/data-privacy-and-hardening.md)
("any other considerations for hardening the app"). Legal policies (terms,
privacy policy, DMCA, breach duties) are in
[operator-liability-and-policies.md](./operator-liability-and-policies.md);
encryption in [user-data-encryption.md](./user-data-encryption.md). Builds on
the decided work in this category ([index.md](./index.md)) and on
[../devops-deployment/monitoring-and-observability.md](../devops-deployment/monitoring-and-observability.md).
Every question below is collected in
[decisions.md](../requests/2026-10-14/decisions.md).

**Summary.**

- The decided design is strong on **authorization** (OWASP A01) and weak on
  **operations**: much of what was decided is not built, and several abuse and
  availability controls are missing.
- **Two live defects** were found and confirmed (next section). Fix them
  regardless of any other decision.
- Decided but **not built**: the CSP/headers middleware, GlitchTip, and the CI
  scanners (Gitleaks, Semgrep, `npm audit`). Until they exist, the decided
  posture is not the real one.
- Also missing: upload limits before the body is read, container resource
  limits and network isolation for the PDF parsers, base-image refresh on
  deploy, a dependency bot, data export, a sessions UI, `security.txt`, an
  off-host uptime check and a secret-rotation runbook.
- The must-have list is about **1–2 focused weeks**, mostly items under a day.

Source caveat: the researcher's page fetches failed, so web claims come from
search-result summaries. Library behaviour was checked directly in the
installed packages (`better-auth@1.6.25`, `@rocicorp/zero@1.8.0`). Items marked
*verify* come from the researcher's memory and need checking before use.

## Found during research: live defects

These are in production now. The orchestrator confirmed both first-hand.

1. **All public users share one Better Auth rate-limit bucket.** The EC2 relay
   masquerades every public client to `10.100.0.1` (see "Return-path
   masquerade" in
   [hosting-and-infrastructure.md](../devops-deployment/hosting-and-infrastructure.md#addendum-2026-07-06-public-ingress-as-deployed)),
   so Better Auth's per-IP limits put every user in one bucket per path. Its
   production defaults (read in the installed package) are 100 requests per
   10 s, and **3 per 10 s on `/sign-in*` and `/sign-up*`**, in process memory.
   Two or three people signing in at once can get 429s, and one person
   hammering sign-in locks everyone out. The repository's docs say rate
   limiting was "deferred", but the library does it anyway.
   *Fix now:* loosen or disable the sign-in path rules with
   `rateLimit.customRules` until real client IPs exist; Google sign-in gives
   brute-force resistance and there is no password endpoint.
2. **Deleting an account leaves the user's PDFs in Garage.** Only the
   `articles.delete` mutator enqueues PDF cleanup (`src/zero/server-effects.ts`),
   and `src/auth/create-auth.ts` has no deletion hook. The Postgres cascade
   removes rows but never runs a mutator, so every object under
   `lit-tracker/<userId>/` is orphaned. A broken privacy promise and an
   invisible quota leak.
   *Fix now:* in Better Auth's `user.deleteUser.beforeDelete`, enqueue one
   pg-boss job that deletes the user's whole Garage prefix with retries, keyed
   by user id only; add an integration test on the existing Testcontainers
   Garage.

## Options

Status: **Have** (built), **Decided** (not built), **Missing**. Effort: S
under a day, M a few days. Priority: **MUST** before public launch,
**SHOULD** soon after, **NICE**.

### Abuse controls and rate limiting

| Control | Status | Effort | Priority |
|---|---|---|---|
| Better Auth limiter correct behind the relay | Defect 1 above | S | MUST |
| Upload: reject on `Content-Length` before reading; Caddy `request_body max_size` on the route | Missing — `request.formData()` buffers up to ~1 GB (20 × 50 MB) before any check | S | MUST |
| Per-user upload rate and in-flight job cap (e.g. 20 queued jobs, then 429) | Missing | S–M | MUST |
| Zero per-user mutation limit (`ZERO_PER_USER_MUTATION_LIMIT_MAX`; unset means no limit) | Missing, one setting | S | MUST |
| Per-user cap on row counts (annotations, tags, articles) | Missing — see QM7 in [quotas-and-usage-metering.md](../system-architecture/quotas-and-usage-metering.md) | M | SHOULD |
| Real client IPs at the node | Missing (accepted in hosting docs) | M | SHOULD |
| Sign-up circuit breaker / invite mode (`databaseHooks.user.create.before`) | Missing | S | SHOULD |
| Proof-of-work CAPTCHA (Cap, ALTCHA) | Missing | M | NICE, only if upload abuse appears |

The storage and bandwidth quotas are themselves the strongest abuse control;
enforce them **before** the bytes are read.

Real client IPs, options: (1) drop SNAT on the relay and use policy routing on
the home node ([Lawrence Systems](https://forums.lawrencesystems.com/t/how-to-self-hosting-by-hiding-your-home-ip-with-a-vps-wireguard-relay-keeping-real-client-ips/27129));
(2) PROXY protocol from a small forwarder on the relay, parsed by Caddy's
`proxy_protocol` listener wrapper with `trusted_proxies` restricted to the relay
([Caddy community](https://caddy.community/t/caddy-proxy-protocol-parsing-and-trusted-proxies-syntax-question/31553),
[inlets](https://inlets.dev/blog/tutorial/2024/10/08/real-client-ips-ingress-nginx-caddy-traefik.html));
(3) keep the masquerade and limit by user id only. A Caddy rate-limit module
([caddy-ratelimit](https://github.com/mholt/caddy-ratelimit)) needs a custom
build and is useless behind the relay until real IPs exist
([issue 19](https://github.com/mholt/caddy-ratelimit/issues/19)).

### Upload safety and parser isolation

Uploaded PDFs are only ever served to their owner, so the targets worth
defending are the app server and Postgres (via a parser exploit) and
availability. Parsers reading attacker-controlled bytes: GROBID (Java plus the
native `pdfalto`) and pdfium WASM inside the app process, which holds the
database and Garage credentials.

| Choice | Recommendation | Why |
|---|---|---|
| ClamAV | **Do not add** | Signature-based; its own PDF-parsing bugs ([USN-3940-2](https://ubuntu.com/security/notices/USN-3940-2)); cannot find illicit but valid documents |
| Rewriting or rasterizing PDFs (Dangerzone, qpdf) | **Do not add** | Rasterizing drops the text layer, breaking reading, annotations, outline and GROBID ([Dangerzone](https://www.linuxlinks.com/dangerzone-make-pdfs-safe/)) |
| **Sandbox the parsers** | **Do** | `mem_limit`, `cpus`, `pids_limit`, `read_only` with `tmpfs`, `cap_drop: [ALL]`, `no-new-privileges` on every service ([stackharbor](https://stackharbor.com/fr/base-de-connaissances/docker-compose-production/)); GROBID on an `internal: true` network with no internet ([Docker](https://docs.docker.com/compose/how-tos/networking/)), memory above GROBID's 2–4 GB guidance ([GROBID Docker](https://grobid.readthedocs.io/en/latest/Grobid-docker/)) |
| Bound the pdfium step | **Do** | Run it in a `worker_threads` Worker with `resourceLimits`, a timeout and a page ceiling (e.g. 2000 pages). PDF decompression bombs are a live class in 2026 ([pdf-lib advisory](https://www.vulncheck.com/advisories/pdfme-pdf-lib-before-5.5.10-denial-of-service-via-decompression-bomb)) |
| App port | **Bind to `127.0.0.1:3000`** | Published Docker ports bypass the host firewall and currently listen on all interfaces |

pdfium had heap-overflow CVEs in 2026 ([CVE-2026-6306](https://stack.watch/vuln/CVE-2026-6306/),
[CVE-2026-4455](https://www.wiz.io/vulnerability-database/cve/cve-2026-4455));
`pdfalto` has a CVE history ([releasealert](https://releasealert.dev/github/kermitt2/pdfalto/cves)).
Whether GROBID 0.9.1 bundles a fixed `pdfalto` is *unverified*. Also cheap on
the PDF route: `content-security-policy: sandbox` and
`cross-origin-resource-policy: same-origin`.

### Deletion completeness and data export

Beyond defect 2: pg-boss job rows should have bounded archive retention
(*verify* the settings); journald holds ids only for about a month; the
browser cache is an accepted consequence; **backups** keep a deleted user's
data up to about 12 months under the decided retention. Regulators' stated
position, from secondary sources ([probackup](https://www.probackup.io/blog/gdpr-and-backups-how-to-handle-deletion-requests),
[verasafe](https://verasafe.com/blog/do-i-need-to-erase-personal-data-from-backup-systems-under-the-gdpr/)),
is that backups may keep the data "beyond use" with a defined retention and
disclosure. So: keep a **deletion tombstone list** that the restore procedure
re-applies, and state the backup window in the privacy policy.

**Data export** is missing: a streaming ZIP of `articles.json`,
`annotations.json`, `tags.json`, `citations.json` and the PDFs, rate limited to
once an hour (GDPR Art. 20, [text](https://gdpr-info.eu/art-20-gdpr/), if GDPR
applies). Under client-side encryption the client must produce it, so keep the
format stable. Effort M.

### Logging, errors, uptime, resource exhaustion

- **Logging rule for site-wide guidance:** log ids and error classes, never
  titles, filenames, PDF text, annotation text, emails or request bodies. Some
  sites log whole error objects, which may carry document text (*uncertain*); a
  small logger wrapper with a field allowlist enforces the rule.
- **Audit log:** sign-in, sign-out, session revoked, account deleted, upload
  rejected (reason only), quota hit, 429s, role changes, admin views. User id,
  event, time; no content. OWASP A09 names missing alerts, not only logs.
- **Error reporting:** build the decided GlitchTip with `sendDefaultPii: false`
  and a `beforeSend` that drops bodies and query strings
  ([Sentry docs](https://docs.sentry.io/platforms/javascript/guides/koa/data-management/sensitive-data/));
  GlitchTip's parity with every Sentry option is unconfirmed, so inspect a test
  event.
- **Uptime:** the decided doc said to revisit monitoring "if this project ever
  grows real external users"; that has happened. The monitor must not run on
  the monitored host. **Gatus** (config in git) on the EC2 relay, alerting to
  ntfy, or a scheduled GitHub Actions check
  ([comparison](https://www.bitdoze.com/uptime-kuma-vs-gatus/)). Gatus's ntfy
  support is *unverified*. Add a `/healthz` that checks the database (none exists).
- **Resource exhaustion:** no container has limits today. Add a host disk alert
  at 80%; a Garage bucket quota as a last resort (flag names unconfirmed,
  [commit](https://git.deuxfleurs.fr/jpds/garage/src/commit/77e3fd6db2c9cd3a10889bd071e95ef839cfbefc));
  set Postgres `max_connections` and every pool size explicitly (defaults of 10
  and 100 are from memory, *verify*); explicit Caddy timeouts (*verify* names).

### Supply chain and host

| Item | Status | Priority |
|---|---|---|
| Wire Gitleaks, Semgrep, `npm audit` into `ci.yml` | Decided, not built | MUST |
| `deploy.sh` uses `build --pull`, plus a weekly rebuild (`node:22-slim` never refreshes today) | Missing | MUST |
| Renovate or Dependabot with a 7-day release-age cooldown ([vulert](https://vulert.com/blog/renovate-vs-dependabot/)); a separate rule for digest updates (a Renovate digest bug was reported fixed in 44.3.1, *unverified*) | Missing | MUST |
| Branch protection and 2FA: anyone who can push to `main` gets code execution on the home node | Not checked | MUST |
| Pin image digests | Tags only | SHOULD |
| NixOS `system.autoUpgrade` — an unattended reboot stops at the LUKS prompt unless remote unlock exists | Unknown (flake not in this repo) | SHOULD |

The cooldown matters: Shai-Hulud npm worm waves continued through 2026
([CSA Singapore](https://csa.gov.sg/alerts-and-advisories/advisories/ad-2026-009),
[Unit 42](https://unit42.paloaltonetworks.com/es-la/monitoring-npm-supply-chain-attacks.md)).

### Headers, sessions, admin, DoS, incident response

- **Headers:** build the decided CSP middleware (Report-Only first, with a
  report endpoint), including the 2026-08-13 amendment (`'wasm-unsafe-eval'`,
  `worker-src 'self' blob:`, `img-src 'self' blob:`). Do **not** add COEP;
  `require-corp` blocks cross-origin subresources and nothing found says the
  reader needs it ([cinevva](https://app.cinevva.com/tutorials/coop-coep-sharedarraybuffer)).
  Test that `connect-src 'self'` covers the zero-cache WebSocket in Safari.
- **Sessions:** add a settings section listing sessions, revoking one, and
  signing out everywhere (Better Auth has `listSessions`, `revokeSession`,
  `revokeOtherSessions`, [docs](https://better-auth.com/docs/1.6/concepts/session-management.md)).
  Rotate `BETTER_AUTH_SECRET` with the secrets array to avoid logging everyone
  out.
- **Admin accounts:** admin security equals the admin's Google account
  security. Grant admin only via `.env`, never an app endpoint; require a fresh
  session for admin pages; log every admin view; use a dedicated Google account
  with 2-step verification. See
  [roles-and-administrators.md](../system-architecture/roles-and-administrators.md).
- **DoS:** the home uplink is the bottleneck. **No CDN at launch**: it would be
  a proprietary exception, it terminates TLS and sees every PDF, and
  `private, no-cache` PDFs would not be cached anyway. Instead: per-source
  limits at the relay with iptables (*verify*), Caddy timeouts and body caps,
  per-user quotas, and a tested "panic" switch (turn off the relay's DNAT).
  AWS Shield Advanced is $3,000/month ([AWS](https://aws.amazon.com/shield/features)).
- **Incident response:** publish `/.well-known/security.txt` (RFC 9116:
  `Contact` and `Expires` required, [IANA](https://www.iana.org/assignments/security-txt-fields/security-txt-fields.xhtml))
  with an `Encryption:` line to the existing WKD key; write a secret-rotation
  runbook (each secret in the env file, its rotation order and restart; the
  restic password stored offline); a playbook to take the site offline,
  invalidate all sessions and restore; a private incident log.

## Recommendation

*A recommendation, not a decision.* Fix the two live defects now. Then:

**MUST before wider public use:** upload limits before reading the body, per-user
upload and job caps, the storage quota checked first; container hardening
(limits, GROBID internal-only, read-only roots, dropped capabilities, app port
on loopback), Zero's per-user mutation limit, explicit connection counts; the
decided CSP middleware and CI scanners; `build --pull` plus a weekly rebuild, a
dependency bot with a cooldown, branch protection and 2FA; GlitchTip with PII
scrubbing, `/healthz` and an off-host uptime check; a bounded pdfium step;
`security.txt` and a secret-rotation runbook.

**SHOULD soon after:** real client IPs, then per-IP limits; sessions UI; audit
log and logging wrapper; data export; per-user row caps; sign-up circuit
breaker and invite toggle; admin hardening before any admin feature ships;
auto-upgrade together with a LUKS remote-unlock plan; disk alert and bucket
quota.

**Do not add:** ClamAV, PDF rewriting, a custom Caddy build before real IPs,
COEP, a CDN (unless attacked, and only after an explicit exception).

## Reasoning

- Each item reuses something already in the stack: Better Auth hooks and
  limits, the pg-boss cleanup job, the existing upload validation module,
  Zero's own limit, Compose's own isolation options, the decided ntfy sink.
- The threat model (PDFs served only to their owner) is why sandboxing beats
  scanning or sanitizing: the risk is to the server, not to other users.
- Pull-based deploy is a strong design whose one consequence is that the
  GitHub account is the root of trust, hence branch protection and 2FA.

## Questions for the user

Numbered as in [decisions.md](../requests/2026-10-14/decisions.md).

- **H1.** Bind the app port to loopback only (is anything on the home LAN meant
  to reach it)?
- **H2.** Get real client IPs by changing the relay (PROXY protocol) or the
  node (policy routing), or stay with user-id limits only?
- **H3.** Uptime monitor on the EC2 relay (Gatus), or a scheduled GitHub
  Actions check?
- **H4.** An invite or allowlist mode for the first weeks?
- **H5.** Does the node's NixOS flake use `system.autoUpgrade`, and is there
  remote LUKS unlock (initrd SSH or TPM)?
- **H6.** Is a CDN ever acceptable as an exception to the open-source rule?
- **H7.** What maximum page count per PDF is reasonable for the pdfium step?
- **H8.** Approve the MUST list above as the hardening scope?

Shared with other documents: BK10 (backup retention of deleted users' data),
QM8 (export and bandwidth), QM7 (row caps), L8 (abuse/security mailbox).

## Sources

- Installed packages (primary): `better-auth@1.6.25` (`create-context.mjs`, `api/rate-limiter/index.mjs`, `utils/ip.mjs`, `update-user.mjs`) — limiter defaults, shared-bucket fallback, `beforeDelete`/`afterDelete`, secrets array; `@rocicorp/zero@1.8.0` (`zero-config.js`) — `perUserMutationLimit`, unset means no limit.
- Repository: `src/auth/create-auth.ts`, `src/zero/server-effects.ts`, `src/lit-tracker/upload/*`, `src/lit-tracker/pdf/cleanup-stage.ts`, `docker-compose.yml`, `Dockerfile`, `deploy/deploy.sh`, `.github/workflows/ci.yml`, `package.json`.
- [Better Auth rate limit](https://better-auth.com/docs/concepts/rate-limit), [session management](https://better-auth.com/docs/1.6/concepts/session-management.md), [1.5 notes](https://better-auth.com/blog/1-5) — limiter options; session APIs.
- [The Register](https://www.theregister.com/2025/11/11/new_owasp_top_ten_broken/), [Reflectiz](https://www.reflectiz.com/blog/owasp-top-ten-2025/), [Invicti](https://invicti.com/blog/web-security/owasp-top-10), [arc42 — ASVS](https://quality.arc42.org/standards/owasp-asvs) — OWASP Top 10 2025; ASVS 5.0.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet) — antivirus, sandbox, CDR.
- Parsers: [stack.watch CVE-2026-6306](https://stack.watch/vuln/CVE-2026-6306/), [Wiz CVE-2026-4455](https://www.wiz.io/vulnerability-database/cve/cve-2026-4455), [NVD CVE-2019-9878](https://nvd.nist.gov/vuln/detail/CVE-2019-9878), [releasealert — pdfalto](https://releasealert.dev/github/kermitt2/pdfalto/cves) (CVEs); [GROBID Docker](https://grobid.readthedocs.io/en/latest/Grobid-docker/) (memory, timeouts); [Corgea](https://corgea.com/advisories/vulnerabilities/CVE-2026-59200), [SentinelOne](https://www.sentinelone.com/vulnerability-database/cve-2026-49460/), [VulnCheck](https://www.vulncheck.com/advisories/pdfme-pdf-lib-before-5.5.10-denial-of-service-via-decompression-bomb) (2026 decompression bombs); [USN-3940-2](https://ubuntu.com/security/notices/USN-3940-2), [CVE-2018-0361](https://people.canonical.com/~ubuntu-security/cve/CVE-2018-0361) (ClamAV PDF DoS); [linuxlinks — Dangerzone](https://www.linuxlinks.com/dangerzone-make-pdfs-safe/) (pixel rebuild).
- Edge and abuse: [Caddy request_body](https://caddyserver.com/docs/caddyfile/directives/request_body) (`max_size`, 413); [caddy-ratelimit](https://github.com/mholt/caddy-ratelimit), [issue 19](https://github.com/mholt/caddy-ratelimit/issues/19) (fails behind a proxy); [Caddy community — PROXY protocol](https://caddy.community/t/caddy-proxy-protocol-parsing-and-trusted-proxies-syntax-question/31553), [inlets](https://inlets.dev/blog/tutorial/2024/10/08/real-client-ips-ingress-nginx-caddy-traefik.html), [Lawrence Systems](https://forums.lawrencesystems.com/t/how-to-self-hosting-by-hiding-your-home-ip-with-a-vps-wireguard-relay-keeping-real-client-ips/27129) (real client IPs); [AWS Shield](https://aws.amazon.com/shield/features); [Cap](https://capjs.js.org), [ALTCHA](https://altcha.org/docs/v2/) (self-hosted proof-of-work, self-reported).
- [selfhosting.sh](https://www.selfhosting.sh/compare/uptime-kuma-vs-gatus/), [bitdoze](https://www.bitdoze.com/uptime-kuma-vs-gatus/) — Gatus vs Uptime Kuma.
- [Docker networking](https://docs.docker.com/compose/how-tos/networking/), [stackharbor](https://stackharbor.com/fr/base-de-connaissances/docker-compose-production/), [OneUptime](https://oneuptime.com/blog/post/2026-03-18-harden-podman-container-deployments/markdown) — internal networks; container limits.
- Supply chain: [vulert](https://vulert.com/blog/renovate-vs-dependabot/), [OpenCVE](https://app.opencve.io/cve/CVE-2026-88884) (Renovate vs Dependabot; digest-rule bug); [CSA Singapore](https://csa.gov.sg/alerts-and-advisories/advisories/ad-2026-009), [Unit 42](https://unit42.paloaltonetworks.com/es-la/monitoring-npm-supply-chain-attacks.md) (2026 npm worm waves); [nixpkgs auto-upgrade module (mirror)](https://git.gay/transgirllucy/nixpkgs/src/branch/master/nixos/modules/tasks/auto-upgrade.nix) (`allowReboot`, flake mode).
- Operations: [IANA security.txt fields](https://www.iana.org/assignments/security-txt-fields/security-txt-fields.xhtml), [JPCERT — RFC 9116](https://blogs.jpcert.or.jp/en/2022/08/rfc9116-introduction.html); [Sentry — sensitive data](https://docs.sentry.io/platforms/javascript/guides/koa/data-management/sensitive-data/) (PII scrubbing); [probackup](https://www.probackup.io/blog/gdpr-and-backups-how-to-handle-deletion-requests), [verasafe](https://verasafe.com/blog/do-i-need-to-erase-personal-data-from-backup-systems-under-the-gdpr/), [GDPR Art. 20](https://gdpr-info.eu/art-20-gdpr/) (backups and erasure; portability); [cinevva](https://app.cinevva.com/tutorials/coop-coep-sharedarraybuffer) (COOP/COEP); [Garage bucket quotas commit](https://git.deuxfleurs.fr/jpds/garage/src/commit/77e3fd6db2c9cd3a10889bd071e95ef839cfbefc); [pg-boss issue 4](https://github.com/timgit/pg-boss/issues/4) (no native bounded queue).
- Not sourced (researcher's memory, verify): node-postgres pool size 10; Postgres `max_connections` 100; iptables `connlimit`/`hashlimit`; Caddy timeout option names; Gatus ntfy support; `npm audit signatures`.
