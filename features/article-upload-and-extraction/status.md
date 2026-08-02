# Status: Article Upload and Extraction

**Feature state:** Spec'd (2026-08-01), not started. Five tasks, sequential,
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
| `zero-sync-foundation` | Not started ([#67](https://github.com/nicbk/nicbk-website/issues/67)) | — | — | — |
| `lit-tracker-shell` | Not started ([#68](https://github.com/nicbk/nicbk-website/issues/68)) | — | — | — |
| `pdf-upload-and-storage` | Not started ([#69](https://github.com/nicbk/nicbk-website/issues/69)) | — | — | — |
| `grobid-extraction-pipeline` | Not started ([#70](https://github.com/nicbk/nicbk-website/issues/70)) | — | — | — |
| `semantic-scholar-enrichment` | Not started ([#71](https://github.com/nicbk/nicbk-website/issues/71)) | — | — | — |

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
  `ZERO_CVR_DB`, `ZERO_CHANGE_DB`) plus a persisted `ZERO_REPLICA_FILE` volume
  — separate databases inside the **existing** shared Postgres, not a second
  service.
- **`pgboss` is excluded from the Zero publication.** Its internal tables are
  unstable across versions; `upload_jobs` is the app-owned projection Zero
  replicates.
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
  the Garage partition before real PDFs are stored, RAM headroom for GROBID's
  ~4 GB alongside zero-cache and Garage, and backup coverage extended to the
  Garage volume — the first data on this site that cannot be rebuilt from the
  repository.
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
  #67–#71 linked under it. All unassigned. Filing them surfaced a stale
  `projects-page` parent (#53, open with its only sub-issue closed) and, behind
  it, an incorrect claim in
  [issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md)
  that GitHub closes a parent automatically — corrected there as a dated
  revision, and #53 closed. Next: task 1, `zero-sync-foundation`.
