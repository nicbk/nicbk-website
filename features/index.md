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

### Phase 3 — Lit Tracker (started 2026-08-01; each needs auth; #7 is the ingest slice everything else builds on; introduced Garage/GROBID/Zero/pg-boss)

| # | Feature | Slug | Status | Depends on |
|---|---|---|---|---|
| 7 | Article upload + extraction pipeline (Garage, pg-boss jobs, GROBID + Semantic Scholar, upload status) | [`article-upload-and-extraction`](./article-upload-and-extraction/description.md) | **Complete** (2026-08-09; all 5 tasks merged, #67 + #68 + #69 + #70 + #71) | #6 |
| 8 | Collection view (card grid, tags, reading status, filtering, live search) | [`collection-view`](./collection-view/description.md) | **Spec'd** (2026-08-09; 4 tasks, awaiting spec review) | #7 |
| 9 | Article detail + PDF reader + annotations | `article-detail-and-reader` | Not yet spec'd | #7 |
| 10 | Citation-graph traversal | `citation-graph-traversal` | Not yet spec'd | #9 |
| 11 | Article edit | `article-edit` | Not yet spec'd | #7 |

## How this roadmap is spec'd out

Following the decided one-at-a-time, gated process, features are fleshed out
**just-in-time** rather than all at once — `app-shell-and-home` (complete),
`about-page` (complete), `error-and-not-found` (complete), `blog` (complete),
`projects-page` (complete), `authentication` (complete),
`article-upload-and-extraction` (complete), and `collection-view` (spec'd) have
full folders today. The rest carry a one-line
intent here and get their full folder
(six files + tasks) written when we reach them, so their specs reflect the
actual state of `main` at that point instead of drifting from a speculative
up-front draft.

#8 was spec'd this way — written the day after #7 merged, against the code #7
actually left rather than a forecast of it: it upgrades that minimal collection
surface (the reserved search slot, the empty sidebar rail, the plain article
list) instead of starting from nothing, and it is the first consumer of the
`/mutate` endpoint #7 shipped real but unexercised.

#9–#11 stay one-liners for the same reason. #11 inherits the failure path #7
deliberately leaves unresolvable, and extends the card menu #8 builds rather
than adding a second one; #10 inherits a populated citation graph plus a
measured list of what is still wrong with it (see
[#7's task status](./article-upload-and-extraction/tasks/semantic-scholar-enrichment/status.md)) —
the graph's accuracy is deliberately #10's problem, not #7's.
