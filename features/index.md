# Features

Live operational state: what is being built, right now, and in what order.
This is a sibling of `src/`, `research/`, and `high-level-guidance/` — not a
research artifact (see
[../research/project-management-conventions/feature-definition-and-scoping.md](../research/project-management-conventions/feature-definition-and-scoping.md)),
but the tracking layer where already-decided research is turned into
implementable work.

## What a feature is

A **feature is one vertical slice** — a complete, independently
testable/demoable unit of user-visible behavior that touches every layer it
needs (UI, server, data) to actually work end-to-end. Infra-only or
route-only horizontal slices are not features on their own; they ride inside
the first feature that actually needs them.

Every feature is a `features/<feature-slug>/` folder with six files
(`plan.md`, `description.md`, `constraints-and-behavior.md`, `testing.md`,
`status.md`, `research.md`) and always at least one `tasks/<task-slug>/`
(four files: `description.md`, `constraints-and-behavior.md`, `testing.md`,
`status.md`, plus `research.md` only if it needs research beyond the
parent's). Work proceeds **one task at a time**, each gated by its own
PR + CI/CD + human review before the next task starts. Slugs are kebab-case.
Full rules, including mandatory `research.md` traceability back into
`research/*.md`, are in
[../research/project-management-conventions/feature-definition-and-scoping.md](../research/project-management-conventions/feature-definition-and-scoping.md).

## Roadmap

Ordered by dependency. Each feature is a vertical slice; infra is introduced
by the first feature that needs it rather than in an up-front infra phase.

### Phase 0 — Foundation (walking skeleton)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 1 | App shell + home page | [`app-shell-and-home`](./app-shell-and-home/description.md) | **Complete** (2026-07-06; all 5 tasks merged) | — |

The first slice necessarily carries the stack bring-up it needs to exist:
the TanStack Start app, routing/route-groups, the design system (tokens,
JetBrains Mono, light/dark theming), the sticky site header, CI, and the
app-server Docker/Compose definition — and delivers the home page on top.
Because the personal site has no reactive data, this slice does **not** stand
up Postgres/Zero/Garage/GROBID; those arrive with the features that first
need them (see Phases 2–3).

### Phase 1 — Static site-wide (complete 2026-08-01; no auth, no data layer)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 2 | About page (incl. GPG fingerprint + WKD/`.asc` publishing) | [`about-page`](./about-page/description.md) | **Complete** (2026-07-07; both tasks merged, #34 + #35) | #1 |
| 3 | Projects page (entry point to Lit Tracker) | [`projects-page`](./projects-page/description.md) | **Complete** (2026-08-01; its one task merged, #55) | #1 |
| 4 | Blog (MDX pipeline + list + post) | [`blog`](./blog/description.md) | **Complete** (2026-07-18; all 3 tasks merged, #37 + #39 + #46) | #1 |
| 5 | 404 + error-fallback pages | [`error-and-not-found`](./error-and-not-found/description.md) | **Complete** (2026-07-07; both tasks merged, #32 + #33) | #1 |

### Phase 2 — Authentication (complete 2026-08-01; gates all of the Lit Tracker; introduced Postgres + Better Auth)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 6 | Authentication (Better Auth + Google OAuth, session hardening, sign-in page, user settings) | [`authentication`](./authentication/description.md) | **Complete** (2026-08-01; all 3 tasks merged, #57 + #59 + #60) | #1 |

### Phase 3 — Lit Tracker (started 2026-08-01; each needs auth; #7 is the ingest slice everything else builds on; introduces Garage/GROBID/Zero/pg-boss)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 7 | Article upload + extraction pipeline (Garage, pg-boss jobs, GROBID + Semantic Scholar, upload status) | [`article-upload-and-extraction`](./article-upload-and-extraction/description.md) | **In progress** (5 tasks; task 1 implemented 2026-08-02) | #6 |
| 8 | Collection view (list, tags, reading status, filter/sort, live sync) | `collection-view` | Not yet spec'd | #7 |
| 9 | Article detail + PDF reader + annotations | `article-detail-and-reader` | Not yet spec'd | #7 |
| 10 | Citation-graph traversal | `citation-graph-traversal` | Not yet spec'd | #9 |
| 11 | Article edit | `article-edit` | Not yet spec'd | #7 |

## How this roadmap is spec'd out

Following the decided one-at-a-time, gated process, features are fleshed out
**just-in-time** rather than all at once — `app-shell-and-home` (complete),
`about-page` (complete), `error-and-not-found` (complete), `blog` (complete),
`projects-page` (complete), `authentication` (complete), and
`article-upload-and-extraction` (in progress) have
full folders today. The rest carry a one-line
intent here and get their full folder
(six files + tasks) written when we reach them, so their specs reflect the
actual state of `main` at that point instead of drifting from a speculative
up-front draft.

#8–#11 stay one-liners for now on purpose: each is shaped by what #7 actually
leaves behind. #8 upgrades the minimal collection surface #7 builds rather than
starting from nothing, and #11 inherits the failure path #7 deliberately leaves
unresolvable — details worth spec'ing against merged code, not a forecast of it.
