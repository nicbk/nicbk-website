# Research: DevOps / Deployment & CI

Status: all 8 topics researched and decided (2026-07-05).

Build, deployment, and hosting practices, and continuous integration setup —
the "how it ships and stays running," as distinct from
[technologies/index.md](../technologies/index.md), which covers *what* runs.
Builds on the single-node topology decided in
[../system-architecture/service-topology.md](../system-architecture/service-topology.md)
(app server, zero-cache, Postgres, Garage, and a GROBID container all on one
host), and owns the mechanisms that
[../project-management-conventions/review-process.md](../project-management-conventions/review-process.md)
(CI/CD gate), [../project-management-conventions/commit-message-conventions.md](../project-management-conventions/commit-message-conventions.md)
(PR-title linting), and
[../project-management-conventions/changelog-and-versioning.md](../project-management-conventions/changelog-and-versioning.md)
(changelog generation as a pipeline step) deferred here.

Guiding principles for every topic in this category:

- **Prefer open-source tooling and services wherever possible** — this
  extends the open-source-only constraint from
  [DESIGN.md](../../high-level-guidance/design/DESIGN.md) beyond the app
  stack itself to the devops tooling that builds, ships, and operates it
  (CI runners, monitoring, secrets management, etc.), not just
  user-facing/application components.
- **Streamlined operations: minimal manual configuration.** Favor
  automation, convention, and managed/self-service tooling over
  hand-maintained infrastructure or steps a human must remember to run —
  this is a personal project without a dedicated ops role, so anything
  requiring ongoing manual upkeep is a standing cost to weigh heavily
  against alternatives.

## Topics

- [hosting-and-infrastructure.md](./hosting-and-infrastructure.md) — Decided.
  Existing NixOS bare-metal home node + existing WireGuard mesh/EC2 relay
  (pure `nftables` DNAT passthrough). All 5 services (Postgres, Garage,
  GROBID, app server, zero-cache) unified into one `docker-compose.yml` run
  identically via `docker compose up` locally (OrbStack) and in production
  (a NixOS systemd unit), trading away NixOS-native service modules for one
  genuine local/prod definition with working hot-reload. Caddy + ACME stay
  NixOS-native; this repo's `nixosModules.default` is consumed as a pinned
  flake input by the general system flake.
- [ci-pipeline.md](./ci-pipeline.md) — Decided; runner revised 2026-07-06.
  GitHub Actions workflows (repo is public) on **GitHub-hosted runners** —
  the originally decided self-hosted Sysbox runner turned out to be
  unavailable on the NixOS host (Sysbox is not packaged in nixpkgs; see
  the doc's revision addendum for the alternatives compared). Gated by
  GitHub's outside-collaborator approval requirement and a
  `pull_request`-only (never `pull_request_target`) trigger, given the
  public-repo/fork-PR threat model. Runs Biome lint/format, typecheck,
  the test suite (tooling deferred to `testing-qa/`), PR-title
  Conventional Commits linting via `amannn/action-semantic-pull-request`,
  and a security-scanning step (tool deferred to `security-privacy/`).
- [deployment-strategy.md](./deployment-strategy.md) — Decided. Pull-based
  continuous deployment: the existing NixOS systemd deploy unit becomes a
  timer (proposed every 2 min) that polls `origin/main`, and on a new
  commit runs `git pull && docker compose build && docker compose up -d`
  on the host itself — no GitHub-triggered process (including the CI
  runner) is ever given Docker socket or production-network access.
  Rejected a push-triggered privileged runner, an SSH/webhook deploy, and
  GitOps tools (Watchtower dead upstream, Komodo unneeded for one host).
  Images build on-host at deploy time rather than in CI-and-pushed to a
  registry. Rollback is reverting the commit on `main` and letting the
  timer redeploy, or a manual `git checkout` on the host for urgency.
- [containerization-and-build.md](./containerization-and-build.md) —
  Decided. App server: multi-stage Dockerfile (`dev`/`build`/`runner`
  targets), split across a base `docker-compose.yml` (target: `runner`,
  for production) and a local-only `docker-compose.override.yml` (target:
  `dev`, bind mounts + HMR env vars) — Compose's built-in override
  mechanism, not a custom env-var switch. npm as package manager;
  `node:<version>-slim` (not Alpine, given native-module risk in the
  Zero/Better Auth dependency space) for the runtime stage; TanStack
  Start's `.output/server/index.mjs` as the production entry point. The
  four pre-built services (Postgres, Garage, GROBID, zero-cache) use
  official images pinned to specific version tags, not `latest` and not
  content digests.
- [secrets-and-environment-config.md](./secrets-and-environment-config.md) —
  Decided. Secrets (Better Auth's session secret + Google OAuth creds,
  Postgres password, Garage's S3-style keys + `rpc_secret`, Zero's
  `ZERO_PUSH_API_KEY` + admin password) are provisioned manually, directly
  on the host — a git-ignored `.env`, never committed even encrypted, since
  the repo is public and ciphertext pushed publicly is permanently exposed
  regardless of later rotation. Garage's `admin_token` is avoided entirely
  in favor of short-lived scoped tokens. File-based Compose secrets
  (`/run/secrets/*`) used only where an image already supports the
  `_FILE` convention for free (Postgres, Garage); plain `env_file:`
  elsewhere, including the app server. CI needs zero GitHub-side secrets.
- [database-migrations.md](./database-migrations.md) — Decided. Drizzle +
  Drizzle Kit owns actual Postgres DDL; the official `drizzle-zero`
  generator produces `zero/schema.ts` automatically (Drizzle's schema is
  now the canonical data-shape source, revising
  `../coding-conventions/typescript-conventions.md`'s original framing).
  No separate schema/permissions push to `zero-cache` needed (the old
  `zero-deploy-permissions` step is deprecated). Migrations run via
  Compose's native `pre_start` init mechanism before the app server starts.
  Expand/contract migrations are mandatory given the revert-code-not-schema
  rollback model, with contracting changes deployed separately given
  Zero's larger full-resync blast radius on detected schema changes.
- [backup-and-disaster-recovery.md](./backup-and-disaster-recovery.md) —
  Decided. **restic** as the single backup tool for both Postgres
  (`pg_dumpall` piped via stdin) and Garage (`metadata_dir`/`data_dir`
  backed up directly, per Garage's own cookbook), on one systemd timer
  consistent with `deployment-strategy.md`'s pattern. Scheduled logical
  dumps (no WAL-based PITR — `wal_level=logical` for Zero gives no free
  backup infrastructure here) pushed offsite to a cheap S3-compatible
  service (no second physical machine exists). Standard
  daily/weekly/monthly retention, with periodic `restic check` and test
  restores, not just written-and-assumed-good backups.
- [monitoring-and-observability.md](./monitoring-and-observability.md) —
  Decided. The `journald` Docker logging driver for all containers, no new
  aggregator. Self-hosted **GlitchTip** (MIT, one new container + a new
  database in the existing Postgres instance, no Redis needed since v6) for
  error tracking, chosen over hosted Sentry's free tier once GlitchTip's
  real footprint was corrected, and over self-hosted Sentry (25+
  microservices, wildly disproportionate). No dedicated uptime monitoring
  — full-outage detection is judged self-evident for a solo-maintainer
  personal project; **ntfy.sh** is the shared alert sink for GlitchTip's
  webhook notifications.
