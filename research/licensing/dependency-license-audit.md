# Dependency License Audit

Decision: no component in the chosen stack conflicts with the "every
component is open source" constraint in
[DESIGN.md](../../high-level-guidance/design/DESIGN.md). Two dependencies
carry a copyleft license whose obligations must be respected by usage
pattern rather than avoided outright — **Garage** (AGPLv3, a shipped
network service) and **Semgrep** (LGPL-2.1, a CI-only binary). Both are
documented below and carried forward into
[project-license-selection.md](./project-license-selection.md); neither
reaches the project's own application code under its actual usage pattern.

## Clean — permissive, OSI-approved, no obligations beyond attribution retention

| Component | License |
|---|---|
| PostgreSQL | PostgreSQL License (BSD/MIT-style) |
| Better Auth | MIT |
| TanStack Start | MIT |
| `@mdx-js/rollup`, `remark-frontmatter`, `remark-mdx-frontmatter` | MIT (mdx-js org) |
| GROBID | Apache 2.0 |
| EmbedPDF | MIT |
| Caddy | Apache 2.0 |
| Sysbox | Apache 2.0 |
| `docker/github-actions-runner` | MIT |
| Zero (Rocicorp) | Apache 2.0 |
| Drizzle ORM, Drizzle Kit | Apache 2.0 |
| `drizzle-zero` (Rocicorp) | Apache 2.0 |
| Base UI (`@base-ui-components/react`) | MIT |
| pg-boss | MIT |
| Zod | MIT |
| Lucide (`lucide-react`) | ISC |
| Shiki | MIT |
| `rehype-pretty-code` | MIT |
| `remark-lint` | MIT |

The shipped runtime dependencies below the `drizzle-zero` row — the Base UI
component library ([../ui-ux/design-system.md](../ui-ux/design-system.md)),
the pg-boss background-job queue
([../system-architecture/background-jobs.md](../system-architecture/background-jobs.md)),
Zod, the Lucide icon set, and the Shiki/`rehype-pretty-code`/`remark-lint`
MDX-pipeline packages
([../documentation-content-conventions/index.md](../documentation-content-conventions/index.md))
— were all decided in later sessions after this audit's original pass, and
verified here the same way Drizzle was: directly against each package's
published `license` field (npm registry / GitHub API), not assumed. ISC is
a functionally MIT-equivalent permissive license (OSI-approved,
attribution-only). All are clean.

## Development / CI / operations tooling — permissive, not shipped in the app

These tools run at build/test/CI/operations time and are **not linked into
or distributed as part of the application's own runtime**, which matters
for the one weak-copyleft item among them (Semgrep, flagged separately
below). Licenses verified against each project's published `license` field
(npm registry, GitHub API, GitLab API) rather than assumed.

| Component | License |
|---|---|
| Vitest | MIT |
| Playwright | Apache 2.0 |
| MSW (Mock Service Worker) | MIT |
| Biome | MIT OR Apache-2.0 |
| Testcontainers | MIT |
| WireMock | Apache 2.0 |
| MockServer | Apache 2.0 |
| Gitleaks | MIT |
| restic | BSD-2-Clause |
| GlitchTip | MIT |
| ntfy | Apache 2.0 |
| git-cliff | Apache 2.0 |

Zero was the one component suspected of carrying a source-available/BSL-style
license rather than a clean OSI-approved one. Verified: both the client and
server are Apache 2.0. Rocicorp's business model is a *hosted service* of
the same open-source code, not a license restriction — see
[zero.rocicorp.dev/docs/open-source](https://zero.rocicorp.dev/docs/open-source),
which states the code can be used, modified, hosted, and distributed
freely. This closes the open question
[sync-engine.md](../technologies/sync-engine.md) had flagged.

Drizzle ORM, Drizzle Kit (same monorepo/license), and Rocicorp's
`drizzle-zero` generator were added after this audit's original pass, once
[../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md)
settled on Drizzle as the project's ORM/migration tool. Verified directly
against the GitHub API (`license.spdx_id`) rather than assumed: all three
are Apache-2.0, same as Zero itself.

## Flagged — Garage (AGPLv3)

Garage is licensed under **AGPLv3**, a copyleft license whose disclosure
obligation is triggered by *network use*, not just distribution/sale —
i.e. it can reach a self-hosted service that users only ever interact with
over a network, not just software that's shipped/sold.

The obligation applies to *modifications to Garage's own source*: if
Garage is modified and made available to network users, those
modifications must be disclosed under AGPL. It does not reach upward and
place the project's own application code (the TanStack Start app,
Lit Tracker, etc.) under AGPL merely because Garage sits in the same
stack — that would only be a risk if Garage's code were statically
linked/embedded into the project's own binary rather than run as its own
process.

Per
[hosting-and-infrastructure.md](../devops-deployment/hosting-and-infrastructure.md),
Garage already runs as its own container in the unified `docker-compose.yml`
— a separate network service, not embedded into the app. Under that
deployment shape, AGPL's obligation is very likely a non-issue in practice.

**Constraint to carry forward:** don't fork or patch Garage's source without
accepting the AGPL disclosure obligation that comes with it. Keep it
unmodified and running as a separate service. This must be confirmed
explicitly (not assumed) in
[project-license-selection.md](./project-license-selection.md), since that
topic decides this project's own code license and needs to rule out any
scenario (e.g. a plugin/extension model touching Garage internals) that
would pull the AGPL obligation upward.

## Flagged — Semgrep (LGPL-2.1)

Semgrep's open-source CLI (`semgrep/semgrep`) is licensed **LGPL-2.1**, a
*weak* copyleft license, verified directly against the GitHub API
(`license.spdx_id`). LGPL's copyleft reaches modifications to Semgrep's own
source and static/dynamic *linking* into a distributed program — it does
not reach a program that merely *invokes* Semgrep as a standalone external
binary.

Per [../devops-deployment/ci-pipeline.md](../devops-deployment/ci-pipeline.md),
Semgrep runs only as a CI-time static-analysis step, invoked as its own
process; it is never imported, linked, or bundled into the application's
runtime, and nothing built from this project is distributed to end users at
all (it's a self-hosted service). Under that usage pattern LGPL-2.1 imposes
no obligation on the project's own code — the same "separate process, not
embedded" reasoning that makes Garage's AGPL a non-issue applies here, and
more easily, since LGPL is weaker than AGPL and Semgrep isn't even a
network-exposed service.

**Constraint to carry forward:** don't vendor, fork, or statically link
Semgrep's source into the application; keep invoking the released binary as
an external CI tool. This is a much lighter constraint than Garage's, but
noted for completeness in
[project-license-selection.md](./project-license-selection.md).
