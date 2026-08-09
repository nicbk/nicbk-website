# Status: Article Upload and Extraction

**Feature state:** **Complete and closed** (2026-08-09; all five tasks merged,
parent issue [#66](https://github.com/nicbk/nicbk-website/issues/66) closed by
hand — GitHub does not close a parent when its sub-issues close). Five tasks, sequential,
each gated by its own PR + CI + human review. Depends on
[`authentication`](../authentication/status.md) (Complete) — it consumes that
feature's Postgres service, Drizzle migration pipeline, Better Auth session,
`requireAuth` route guard, and user-settings modal, and gives the last two their
**first live consumers**. This is the **second phase transition**: #6 made the
site an application with a database; this makes it a natively reactive one.

Feature parent issue:
[#66](https://github.com/nicbk/nicbk-website/issues/66); task sub-issues
[#67](https://github.com/nicbk/nicbk-website/issues/67)
(`zero-sync-foundation`),
[#68](https://github.com/nicbk/nicbk-website/issues/68)
(`lit-tracker-shell`),
[#69](https://github.com/nicbk/nicbk-website/issues/69)
(`pdf-upload-and-storage`),
[#70](https://github.com/nicbk/nicbk-website/issues/70)
(`grobid-extraction-pipeline`), and
[#71](https://github.com/nicbk/nicbk-website/issues/71)
(`semantic-scholar-enrichment`), all linked as native sub-issues of #66.
**#66 must be closed by hand** when the feature completes — GitHub does not
close a parent when its sub-issues close, per the 2026-08-01 revision in
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `zero-sync-foundation` | **Merged** ([#67](https://github.com/nicbk/nicbk-website/issues/67)) | [#73](https://github.com/nicbk/nicbk-website/pull/73) | passed | approved |
| `lit-tracker-shell` | **Merged** ([#68](https://github.com/nicbk/nicbk-website/issues/68)) | [#74](https://github.com/nicbk/nicbk-website/pull/74) | passed | approved |
| `pdf-upload-and-storage` | **Merged** ([#69](https://github.com/nicbk/nicbk-website/issues/69)) | [#76](https://github.com/nicbk/nicbk-website/pull/76) | passed | approved |
| `grobid-extraction-pipeline` | **Merged** ([#70](https://github.com/nicbk/nicbk-website/issues/70)) | [#77](https://github.com/nicbk/nicbk-website/pull/77) | passed | approved |
| `semantic-scholar-enrichment` | **Merged** ([#71](https://github.com/nicbk/nicbk-website/issues/71)) | [#78](https://github.com/nicbk/nicbk-website/pull/78) | passed | approved |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met and each task
merged behind its own passing CI + human review. In short: a signed-in user
opens `/lit-tracker`, clicks "+", submits one or more PDFs, and watches — with
no refresh — each upload progress and resolve into an article with its title,
authors, abstract, and bibliography extracted; a PDF GROBID cannot parse leaves
a warning row naming the reason, with its article row present for #11 to fix
later. Underneath: Zero syncs user-scoped data through `/query`, Garage holds
the PDFs behind a proxied app-server path, and pg-boss chains GROBID and
Semantic Scholar — all WCAG 2.2 AA in both themes and at every width, verified
by unit + integration (including a non-vacuous cross-user isolation test) + e2e
against stubbed GROBID and Semantic Scholar.

## Notes carried into implementation

- **`/query` is the authorization boundary for all user data on this site.**
  Zero has no RLS-style layer behind it. Scope every query by the `user_id`
  from a **server-derived context**, never from client arguments, and prove it
  non-vacuously — with another user's rows genuinely present.
- **Build on Zero's current (non-legacy) model.** Synced queries + custom
  mutators; leave `ZERO_ENABLE_CRUD_MUTATIONS` false and do not pass
  `drizzle-zero`'s `--enable-legacy-*` flags. See
  [research.md](./research.md).
- **zero-cache needs three Postgres connections** (`ZERO_UPSTREAM_DB` direct,
  `ZERO_CVR_DB`, `ZERO_CHANGE_DB`) plus a persisted `ZERO_REPLICA_FILE` volume.
  Task 1 pointed all three at the **existing** database, with the user's
  agreement — zero-cache namespaces its own data into `zero_0/cvr` and
  `zero_0/cdc` schemas, and separate databases could not be created by a
  migration or by the Postgres image's init scripts.
- **zero-cache is served same-origin, at `nicbk.com/zero`.** Its router accepts
  an optional leading base path segment, so the host's Caddy proxies `/zero/*`
  through untouched and the browser sends the session cookie because nothing is
  cross-origin. Settled in task 2, reversing task 1's note about a
  `zero.nicbk.com` subdomain — which would have meant widening the session
  cookie to every subdomain of the site, permanently, via
  `crossSubDomainCookies`. **The Better Auth configuration is unchanged by this
  feature.**
- **The Zero publication is an explicit allowlist**, `zero_data`, naming only
  the synced tables. It excludes `pgboss` (whose internal tables are unstable
  across versions — `upload_jobs` is the app-owned projection clients read
  instead) and, more importantly, Better Auth's `session` and `account` tables.
  **Every feature that adds a synced table must extend both this publication and
  `drizzle-zero.config.ts`, in the migration that creates the table.**
- **`zero/schema.ts` is generated, not hand-written**, with a CI drift check —
  the same derive-don't-hand-type rule the Better Auth schema and GPG artifacts
  follow.
- **Separated type imports matter more here than anywhere so far.** This feature
  adds the most client/server boundaries yet, and an inline type import leaves a
  surviving side-effect import that drags server-only modules into the client
  bundle — the exact bug found by browser verification in #6's task 3.
- **The extract stage always creates the article row**, success or failure, with
  best-effort fallbacks (`title` → filename, `authors` → `[]`).
- **Enrichment failure is non-fatal**; only a genuinely unparseable PDF is
  terminal, and it is caught explicitly rather than retried.
- **Never issue a presigned Garage URL.** Every PDF read and write is proxied
  through the app server's own authorization.
- **Deployment prerequisites for nicbk-tower** (not application code): LUKS on
  the Garage partition before real PDFs are stored, and backup coverage extended
  to the Garage volume — the first data on this site that cannot be rebuilt from
  the repository. The "RAM headroom for GROBID's ~4 GB" written here described
  the `-full` image; task 4 settled on `0.9.1-crf` (~510 MB, CPU-only), so this
  is no longer a sizing concern.
- **Upload limits are configuration, not architecture**: 50 MB per file, 20
  files per submission, `application/pdf` plus a `%PDF-` magic-byte check.
  Proposed here, easy to change.

## Log

- 2026-08-01 — Feature spec'd as the Phase 3 opener, the first slice with
  user-owned reactive data. Scoping settled with the user beforehand: **five
  tasks** with the Zero bring-up isolated as a backend-only first task and the
  route/header following immediately (chosen over folding them together,
  because `/query` carries every authorization decision for user data and is
  worth its own review); the Lit Tracker lives at **`/lit-tracker`** as its own
  top-level route group; **`citation_edges` are populated here**, in the enrich
  stage, rather than deferred to #10 — deferring would mean re-opening that
  stage later and backfilling every article uploaded before then; and a failed
  upload ships as a **warning row only**, since resolving it needs `article-edit`
  (#11, which depends on this feature). Also confirmed at spec time, per
  research-over-recall: Zero 1.8.0, `drizzle-zero` 0.20.0 (now published from
  `rocicorp/`), pg-boss 12.26.4, and three findings the July research predates —
  zero-cache's three Postgres connections, Zero's move to synced queries +
  custom mutators as the default path, and Semantic Scholar needing no API key.
  Awaiting spec review, then GitHub issues and implementation.
- 2026-08-01 — Spec **merged as [#65](https://github.com/nicbk/nicbk-website/pull/65)**
  (CI green, approved). GitHub issues filed: parent #66 with sub-issues
  #67–#71 linked under it. All unassigned at the time. Filing them surfaced a stale
  `projects-page` parent (#53, open with its only sub-issue closed) and, behind
  it, an incorrect claim in
  [issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md)
  that GitHub closes a parent automatically — corrected there as a dated
  revision, and #53 closed. Next: task 1, `zero-sync-foundation`.
- 2026-08-02 — **Task 1 (`zero-sync-foundation`) implemented**, opened as
  [PR #73](https://github.com/nicbk/nicbk-website/pull/73).
  zero-cache is in the Compose stack and replicating, `articles` and
  `upload_jobs` are migrated, `src/zero/schema.gen.ts` is generated under a CI
  drift check, and `/query` + `/mutate` are live with cross-user isolation
  proven non-vacuously against a real Postgres. Re-verifying Zero 1.8 before
  writing code corrected several assumptions the spec was written on — the
  current API names, `ZERO_ENABLE_CRUD_MUTATIONS` defaulting to **on**, and
  cookie auth needing zero-cache on a subdomain in production — all recorded in
  [research.md](./research.md), with the details and the decisions taken in the
  [task status](./tasks/zero-sync-foundation/status.md). Two carried forward:
  **task 2 owns the cookie and reverse-proxy change**, and Zero has no SSR support, so
  its provider must be loaded client-only.
- 2026-08-02 — **Task 1 merged as [PR #73](https://github.com/nicbk/nicbk-website/pull/73)**;
  the three Zero secrets were provisioned on nicbk-tower beforehand.
- 2026-08-02 — **Task 2 (`lit-tracker-shell`) implemented.** `/lit-tracker`
  exists, behind `requireAuth`, with the tracker's own header and fixed
  app-shell layout, the Zero client mounted client-only at the group root, and a
  live `articles.mine` collection. The site is now demonstrably reactive: a row
  inserted straight into Postgres appears on an open page, and a second
  account's row does not. Two loops #6 left open are closed — the route guard
  and the settings modal both have live consumers, and the test-only
  `/user-settings-probe` was deleted with them. One decision reversed task 1's
  note, with the user's agreement: **zero-cache is served same-origin at
  `nicbk.com/zero`, not from a `zero.nicbk.com` subdomain**, so the Better Auth
  configuration is untouched and the production change is a single Caddy
  `handle` block. Opened as [PR #74](https://github.com/nicbk/nicbk-website/pull/74),
  CI green on all five jobs. Details and the rest in the
  [task status](./tasks/lit-tracker-shell/status.md).
- 2026-08-08 — **Task 2 merged as [PR #74](https://github.com/nicbk/nicbk-website/pull/74).**
  The squash-merge was taken from a head that predated the branch's final
  commit, so the docs correcting the host's reverse proxy from nginx to **Caddy**
  did not land with it and are being re-applied as a follow-up. Worth noting as a
  process hazard rather than a one-off: a push that lands close to a merge click
  is not guaranteed to be in the squash, so a branch's tip should be compared
  against `main` after merging rather than assumed present. Next: task 3,
  `pdf-upload-and-storage`.
- 2026-08-08 — **Task 3 (`pdf-upload-and-storage`) implemented.** Garage is in
  the Compose stack behind a one-shot bootstrap job, PDFs stream through a
  proxied endpoint into `lit-tracker/{user_id}/{id}/source.pdf`, and the "+"
  button, upload modal, and three-state status indicator are live on the
  collection page. Verified against the real stack: two PDFs submitted in one
  action came back byte-identical from Garage, and marking a job failed with
  `psql` turned the indicator red on an open page with no interaction — the same
  write-origin task 4's handler will have. The user asked directly why the
  upload is not a Zero mutation; the answer is recorded in the
  [task status](./tasks/pdf-upload-and-storage/status.md) and in
  `upload-endpoint.ts`, and it is a permanent split rather than a temporary one:
  **bytes in over REST, state out over Zero.** Two findings worth carrying —
  pg-boss now ships an official `fromDrizzle` adapter, so the transactional
  enqueue is supported rather than hand-rolled; and Zero drops sync for a
  *hidden* document, so multi-client checks need a second window, not a second
  tab.
- 2026-08-08 — **Task 3 merged as [PR #76](https://github.com/nicbk/nicbk-website/pull/76)**,
  CI green on all five jobs. Two UI corrections came out of review and are now
  decided-doc revisions rather than task notes: the collection page draws **no
  visible title** and puts its toolbar and list in one content column
  ([collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)),
  and **dialog headers are one row**, title leading, site-wide
  ([user-settings.md](../../research/ui-ux/pages/site-wide/components/user-settings.md)) —
  the latter a deliberate departure from the popup mockup. The **card grid stays
  deferred to #8**, confirmed with the user: cards are the decided presentation,
  but their specified content includes tags and a menu opening `article-edit`
  (#11), so one built now would be missing half its parts. Next: task 4,
  `grobid-extraction-pipeline`.
- 2026-08-08 — **Task 4 merged as [PR #77](https://github.com/nicbk/nicbk-website/pull/77)**,
  CI green on all five jobs. The pipeline's failure classification was rewritten
  during implementation after running real PDFs through a real GROBID: every
  `GrobidException` arrives as **HTTP 500 with the status enum in the body**, so
  the planned "500 is transient" would have retried every corrupt upload to
  exhaustion. A dead-letter queue was added so "transient" cannot mean
  "forever". Next: task 5, `semantic-scholar-enrichment`.
- 2026-08-09 — **Task 5 implemented**, completing the feature's code. The
  citation graph is populated and enrichment runs, verified in the browser
  against a real GROBID and the **real, unauthenticated** Semantic Scholar on
  five papers: venue recovered on every enriched article, *Attention Is All You
  Need* corrected from 2023 (the arXiv revision stamp GROBID read) to 2017, and
  both graduation directions confirmed in the data. Three decisions were taken
  with the user before implementation and are recorded in the task's
  [status.md](./tasks/semantic-scholar-enrichment/status.md): the TEI parser now
  reads arXiv and PubMed identifiers as well as DOIs (without which the feature
  does nothing for preprints), the **extract** stage writes `citation_edges`
  rather than the enrich stage, and Semantic Scholar may correct `venue` and
  `publication_year` when the match came from an identifier. Remaining: review,
  merge, and **closing #66 by hand**.
- 2026-08-09 — **Task 5 merged as [PR #78](https://github.com/nicbk/nicbk-website/pull/78)**,
  CI green on all five jobs, and the whole branch tip confirmed on `main`. The
  feature's code is complete: an uploaded PDF becomes an article with its
  metadata extracted, enriched against Semantic Scholar, and its bibliography
  stored as citation edges that resolve against the rest of the collection in
  both directions.

  Two things grew during review and are worth carrying into #8/#10. The citation
  graph is only usable for machine-learning papers because Semantic Scholar's
  own reference list is used as a source of edges, not just of identifiers —
  13% → 97% on BERT — since a printed ML bibliography cites proceedings by name
  and GROBID silently drops what it cannot segment. And the remaining
  inaccuracy, measured rather than assumed, is **not** missing edges but two
  spurious rows plus four references with no node to point at; the steps for
  closing that are recorded in
  [the task's status.md](./tasks/semantic-scholar-enrichment/status.md) and are
  work for #10.
- 2026-08-09 — **Parent issue #66 closed by hand**, with a table mapping all five
  tasks to their issues and PRs. The feature is complete. Next:
  [`collection-view`](../collection-view/status.md) (#8), which upgrades the
  minimal collection surface this feature leaves and is the first consumer of
  the `/mutate` endpoint task 1 shipped with an empty registry.
