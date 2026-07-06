# Monitoring and Observability

Researched: 2026-07-05. Decided: 2026-07-05.

Logging, error tracking, and uptime monitoring for the single-node stack
decided in
[hosting-and-infrastructure.md](./hosting-and-infrastructure.md) and
[../system-architecture/service-topology.md](../system-architecture/service-topology.md).
Distinct from [../security-privacy/index.md](../security-privacy/index.md),
which covers CI security scanning, auth/session hardening, and security
headers — not logging/monitoring. Guiding principles from
[index.md](./index.md) apply here as everywhere in this category: prefer
open-source tooling, minimize manual configuration.

## Decision

### Logging: the `journald` Docker logging driver, no new service

Every container in the compose stack uses Docker's `journald` logging
driver rather than the default `json-file`. Logs flow directly into the
NixOS host's existing systemd journal — queryable with `journalctl`,
rotated/retained by `services.journald` config the host already has,
without a second log-management surface (log files, rotation config, or a
separate aggregator) to run or maintain. `services.journald.extraConfig`
sets an explicit retention cap (e.g. `SystemMaxUse=1G` and
`MaxRetentionSec=1month`) rather than relying on the default, which is
looser (10% of filesystem, capped at 4GB) than a personal server needs.

A dedicated aggregator (Grafana Loki + Promtail/Alloy) was considered and
rejected: real structured querying and dashboards, but a wholly new stack
to run, upgrade, and secure — a better fit for infrastructure that's
already growing past what `journalctl` can answer, not a fixed personal-scale
project.

### Error tracking: self-hosted GlitchTip

**GlitchTip** — a self-hosted, MIT-licensed, Sentry-SDK-wire-compatible
error tracker — is added as one more container in the existing
`docker-compose.yml`. As of GlitchTip v6 (February 2026), its web server and
background worker run combined in a single container, and its task
queue/cache can run directly against Postgres instead of Redis (Redis/Valkey
is optional, not required) — so the actual addition is one new container
plus one new database inside the Postgres instance this project already
runs, not a second Postgres or a Redis service. Comfortable resource
footprint (~512MB–1GB RAM recommended), well within headroom alongside
GROBID's ~4GB on the same home node. The official `@sentry/*` SDK packages
work against it unmodified — just point the DSN at the self-hosted
instance — so the TanStack Start app server (and client, if desired) gets
standard unhandled-exception capture, grouping, and alerting with no custom
integration work.

This decision has a specific motivating case: `background-jobs.md`'s
already-decided non-fatal-enrichment-failure design means a broken
GROBID/Semantic Scholar step produces **no visible symptom** — an article
just silently never gets enriched. Unlike a full outage (self-evident to
any visitor), this kind of failure would otherwise only surface if someone
went looking through logs. A dedicated error tracker turns that into an
active alert instead of a passive log entry someone has to go find.

GlitchTip's alert recipients support generic webhooks (as well as
Slack/Discord/Google Chat); the generic webhook is pointed at an
[ntfy.sh](https://ntfy.sh/) topic URL (see Alerting below) rather than
building a custom bridge.

**Rejected: hosted Sentry's free Developer plan.** Genuinely zero local
footprint (no container at all), and its Functional Source License was an
accepted tradeoff on its own terms — not part of the shipped application,
so this category's open-source-tooling preference was treated as
negotiable here, the same way OrbStack is scoped out for local-only dev
tooling in `hosting-and-infrastructure.md`. But that tradeoff turned out to
be unnecessary once GlitchTip's real footprint was corrected: an initial
research pass had overstated it as needing a separate Celery worker and a
mandatory Redis (four new moving parts), which would have been a real cost
against self-hosting. With that corrected, GlitchTip fit both guiding
principles at once — no external account/usage limits (Sentry's free tier
caps at 5K errors/month), fully open source, and comparably low overhead —
so there was no remaining reason to prefer the non-open-source option.

**Rejected: self-hosted Sentry.** Considered and rejected outright, not
just against GlitchTip — Sentry's modern self-hosted architecture is 25+
microservices including Kafka, ClickHouse, and Snuba, with official
guidance recommending 4 CPU cores and 16GB RAM. Wildly disproportionate to
a personal-project single host already running five other services.

### Uptime monitoring: not adopted

No dedicated uptime/availability check is added. A scheduled GitHub Actions
workflow (using GitHub-hosted runners, not the project's own
Sysbox-isolated self-hosted runner from `ci-pipeline.md` — the two are
independent, so this wouldn't share the monitored node even though a
runner container happens to live there for PR-triggered CI) was researched
as a genuinely zero-cost, zero-new-infrastructure option, and a self-hosted
Uptime Kuma instance and a free-tier hosted service (UptimeRobot) were also
considered. All three were set aside on the same judgment: for a
single-maintainer personal project, a full node/site outage is
self-evident without automated detection — the maintainer or a visitor
notices directly — so the case for the near-zero-cost GitHub Actions option
came down to catching *partial* failures (crash-looping container, expired
cert, broken subpath) rather than total outages. That gap is judged
adequately covered by GlitchTip's error capture instead, without adding a
separate check to write and maintain.

This is a narrower scope decision than it might first look: it means there
is no independent signal if the entire host becomes unreachable (network
failure, power loss, host crash before GlitchTip itself could report
anything) — GlitchTip only reports errors from a process that's still
running. Revisit if this project ever grows real external users who
wouldn't think to report an outage themselves.

### Alerting: ntfy.sh as the shared sink

**ntfy.sh** — an open-source, self-hostable-later push notification
service — is the single alert destination for GlitchTip's webhook
notifications. Its free hosted tier (topic-based pub/sub, no account
required, a plain HTTP POST to publish) comfortably covers personal-project
alert volume. Chosen over plain email for faster/more-noticeable delivery
(a phone push notification vs. an inbox), with no new infrastructure to run
now — self-hosting it later remains an option if ever wanted, without
changing how GlitchTip publishes to it.

## Reasoning

- `journald` over `json-file`/Loki follows the same minimal-manual-config
  reasoning as `backup-and-disaster-recovery.md`'s tool choices: reuse
  infrastructure the NixOS host already has rather than add a second
  surface that needs its own upkeep.
- The error-tracking decision changed twice as better information arrived,
  which is worth recording since it explains the final shape: first pass
  leaned toward hosted Sentry once FSL licensing was accepted as a
  non-issue (since it's not part of the shipped app) and self-hosted
  GlitchTip was believed to need four new services; a follow-up, more
  careful check of GlitchTip's actual current architecture (combined
  web+worker container since v6, optional Redis) corrected that, at which
  point GlitchTip beat hosted Sentry on its own terms — open source *and*
  comparably low overhead — with no remaining tradeoff to weigh Sentry's
  FSL exception against. This is the same discipline as
  `secrets-and-environment-config.md`'s reversal on sops/age-in-repo: don't
  settle for an initial research pass's framing without re-checking it
  once a more specific question is asked.
- Uptime monitoring's rejection was a deliberate, non-default call: the
  researched option (GitHub Actions on hosted runners) was confirmed
  genuinely zero-cost and infrastructure-free, so this wasn't rejected on
  cost/complexity grounds the way the self-hosted-Uptime-Kuma-on-a-new-host
  option was — it was rejected on a value judgment specific to this
  project's single-maintainer, no-external-user-base scale, which the
  maintainer is best positioned to make.
- ntfy over email was a low-stakes choice made mainly to have one shared
  sink regardless of what fires an alert (today just GlitchTip, potentially
  more tools later) rather than per-tool notification configuration.

## Sources

- [wiki.nixos.org/wiki/Docker](https://wiki.nixos.org/wiki/Docker) —
  `log-driver = "journald"` for Docker on NixOS.
- [ops.functionalalgebra.com — systemd-journald tips](https://ops.functionalalgebra.com/nix/systemd-journald-tips-tricks/),
  [mynixos.com — services.journald options](https://mynixos.com/nixpkgs/option/services.journald.rateLimitBurst) —
  `SystemMaxUse`/`MaxRetentionSec` retention configuration.
- [oneuptime.com — Docker Compose logging configuration](https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-compose-logging-configuration/view),
  [oneuptime.com — Docker logging drivers](https://oneuptime.com/blog/post/2026-01-16-docker-logging-drivers/view) —
  `json-file` vs. `journald` vs. aggregator tradeoffs.
- [glitchtip.com/documentation/install](https://glitchtip.com/documentation/install/),
  [gitlab.com/glitchtip/glitchtip-backend README](https://gitlab.com/glitchtip/glitchtip-backend/-/blob/master/README.md) —
  GlitchTip's current (v6, Feb 2026) architecture: combined web+worker
  container, optional Redis/Valkey, Postgres 14+ requirement, RAM
  footprint.
- GlitchTip's license verified directly against its canonical GitLab repo
  (`gitlab.com/glitchtip/glitchtip`) `LICENSE` file: MIT — correcting an
  initial, unverified assumption of AGPLv3.
- [danubedata.ro — self-host Sentry or GlitchTip 2026](https://danubedata.ro/blog/self-host-sentry-glitchtip-error-tracking-2026),
  [bugsink.com — GlitchTip vs Sentry vs Bugsink](https://www.bugsink.com/blog/glitchtip-vs-sentry-vs-bugsink/) —
  comparative overhead discussion.
- [open.sentry.io/licensing](https://open.sentry.io/licensing/),
  [blog.sentry.io/relicensing-sentry](https://blog.sentry.io/relicensing-sentry/) —
  Sentry's Functional Source License, confirming it's no longer OSI-approved
  open source.
- [sentry.io/pricing](https://sentry.io/pricing/) — hosted Sentry Developer
  plan limits (5K errors/month, 1 user, 30-day retention, free forever).
- [develop.sentry.dev/self-hosted](https://develop.sentry.dev/self-hosted/),
  [develop.sentry.dev/application-architecture/overview](https://develop.sentry.dev/application-architecture/overview/) —
  self-hosted Sentry's Kafka/ClickHouse/Snuba architecture and 4-core/16GB
  RAM guidance.
- [gitlab.com/glitchtip/glitchtip issue #5](https://gitlab.com/glitchtip/glitchtip/-/issues/5),
  [glitchtip.com/blog/2021-07-09-glitchtip-1-7](https://glitchtip.com/blog/2021-07-09-glitchtip-1-7/) —
  GlitchTip's generic-webhook alert recipient support.
- [docs.ntfy.sh/examples](https://docs.ntfy.sh/examples/),
  [ntfy.sh](https://ntfy.sh/), [github.com/binwiederhier/ntfy](https://github.com/binwiederhier/ntfy) —
  ntfy's plain-HTTP-POST publish model and free hosted tier.
- [dev.to/krissv — monitoring GitHub Actions scheduled workflows](https://dev.to/krissv/monitoring-github-actions-scheduled-workflows-a-practical-guide-31h7),
  [oneuptime.com — scheduled workflows/cron in GitHub Actions](https://oneuptime.com/blog/post/2025-12-20-scheduled-workflows-cron-github-actions/view) —
  the scheduled-workflow-as-uptime-check pattern and its
  GitHub-hosted-vs-self-hosted-runner distinction, and the lack of native
  failure alerting for scheduled workflows.
- [github.com/louislam/uptime-kuma](https://github.com/louislam/uptime-kuma) —
  self-hosted Uptime Kuma's maintenance status, considered and not adopted.
