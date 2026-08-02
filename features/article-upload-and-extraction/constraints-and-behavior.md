# Constraints and Behavior: Article Upload and Extraction

Acceptance criteria for the feature as a whole. Each task's own
`constraints-and-behavior.md` states which of these it satisfies.

## Sync engine and services

- A **`zero-cache`** service is added to `docker-compose.yml` as a sibling of
  the existing `db`/`migrate`/`app` services on `app-internal`, pinned to a
  version tag, per
  [service-topology.md](../../research/system-architecture/service-topology.md)
  (single-node mode — not the replication-manager/view-syncer split) and
  [containerization-and-build.md](../../research/devops-deployment/containerization-and-build.md).
- zero-cache's `ZERO_UPSTREAM_DB`, `ZERO_CVR_DB`, and `ZERO_CHANGE_DB` point at
  **separate databases inside the one shared Postgres service**, not a second
  Postgres — the shared-infrastructure constraint in
  [DESIGN.md](../../high-level-guidance/design/DESIGN.md) holds. `wal_level` is
  already `logical` (set in #6 for exactly this).
- **Garage** is added as a single-node Compose service with the standard S3
  API, per
  [blob-storage.md](../../research/technologies/blob-storage.md) and
  [service-topology.md](../../research/system-architecture/service-topology.md).
- **GROBID** is added as a long-lived container on the same host, exposing its
  synchronous REST API. Its ~4 GB RAM footprint is accepted as part of the
  single-node topology.
- All new configuration is declared **required** (or explicitly optional) in
  `src/env.ts`'s Zod schema and documented in the committed `.env.example`;
  every value is **server-only, never `VITE_`-prefixed**, per
  [secrets-and-environment-config.md](../../research/devops-deployment/secrets-and-environment-config.md).
  `SEMANTIC_SCHOLAR_API_KEY` is **optional** — the API works unauthenticated at
  a lower shared rate limit.

## Schema

- `articles`, `upload_jobs`, and `citation_edges` are declared in the Drizzle
  schema and migrated through the existing pipeline, exactly as specified in
  [article-core-schema.md](../../research/data-modeling/article-core-schema.md),
  [upload-jobs-schema.md](../../research/data-modeling/upload-jobs-schema.md),
  and
  [citation-graph-schema.md](../../research/data-modeling/citation-graph-schema.md)
  — including the generated `authors_search` column and its `pg_trgm` GIN
  index, the `extraction_status` enum, and `citation_edges`' nullable
  `cited_article_id` with `ON DELETE SET NULL`.
- Every user-owned table carries a `user_id` FK with **`ON DELETE CASCADE`**,
  per
  [zero-schema-conventions.md](../../research/data-modeling/zero-schema-conventions.md).
  This is what finally gives #6's account deletion a real downstream cascade.
- Primary keys are **client-generated UUIDv7**, with `upload_jobs` the one
  documented exception (Postgres-native `uuidv7()`, since only server code ever
  inserts it). **Hard deletes** throughout — no tombstones.
- `zero/schema.ts` is **generated** from the Drizzle schema via `drizzle-zero`,
  per [orm.md](../../research/technologies/orm.md), and guarded by a CI drift
  check — the same derive-don't-hand-type rule the Better Auth schema and the
  GPG artifacts already follow.
- pg-boss's own `pgboss` schema is **excluded from the Postgres publication
  Zero replicates**, per
  [background-jobs.md](../../research/system-architecture/background-jobs.md) —
  its internal tables are unstable across versions and are never synced.

## Authorization and data isolation

- The app server implements **`/query` and `/mutate`**; every synced query is
  scoped by the `user_id` taken from a **server-derived context** (resolved
  from the Better Auth session), never from client-supplied arguments, per
  [data-sharing-boundaries.md](../../research/system-architecture/data-sharing-boundaries.md).
- A request with no valid session, or one whose arguments name another user's
  rows, returns nothing — **never another user's data**. There is no
  RLS-style layer behind this; these handlers are the enforcement point.
- **PDF reads and writes are proxied through the app server.** No presigned or
  signed Garage URL is ever issued to a client, and no URL is persisted — only
  the stable object key, per
  [pdf-and-annotation-data-protection.md](../../research/security-privacy/pdf-and-annotation-data-protection.md).

## Routes and shell

- The Lit Tracker lives at **`/lit-tracker`**, its own top-level route group —
  it does not use the `(personal-site)` shell, per
  [header.md](../../research/ui-ux/pages/lit-tracker/components/header.md).
- Every `/lit-tracker` route is behind the **`requireAuth` guard** from #6: a
  signed-out visitor is redirected straight to `/sign-in` carrying the
  requested URL, with **no "access denied" interstitial**, per
  [`research/ui-ux/pages/index.md`](../../research/ui-ux/pages/index.md).
- The **lit-tracker header** is a separate component from the site header (not
  a variant): app name on the left linking to the tracker's root, a
  breadcrumb-style path indicator showing the root segment, and a user avatar
  on the far right opening the **existing shared user-settings modal** from #6.
- The header uses the **fixed app-shell layout**, not a scrolling-page sticky
  header: its height is reserved at the top of the viewport and content below
  scrolls in independent bounded panels.

## Upload flow

- The **"+" button** next to the search area opens a **simple modal containing
  only a PDF upload interface** — a file picker allowing **multi-select**, per
  [upload-flow.md](../../research/ui-ux/pages/lit-tracker/components/upload-flow.md).
- **No metadata review or editing** happens before saving. Picking files and
  submitting is a single action; extraction problems are handled later.
- On successful submission the modal **closes immediately** and extraction
  continues in the background.
- Every newly uploaded article is auto-assigned reading status **`pending`**.
- Uploads are validated server-side before storage: **`application/pdf` with a
  `%PDF-` magic-byte check** (the declared content type alone is not trusted),
  a **per-file size cap** and a **per-submission file-count cap**. A rejected
  file produces a clear inline error and stores nothing.

## Upload status indicator

Per
[upload-status.md](../../research/ui-ux/pages/lit-tracker/components/upload-status.md):

- **Three icon states**: uploads in progress → an "uploading" symbol, clickable
  to open the job list; nothing in progress and nothing failed → a
  **non-clickable checkmark** with the hover tooltip **"All articles synced"**;
  one or more failures → a warning icon, clickable to the same popup.
- **Job-list rows**: an in-progress job shows filename plus a progress
  indicator; a failed job shows filename, a warning icon, and a short failure
  reason (e.g. "couldn't find authors"). Multiple failures are just multiple
  rows — no grouping or summary.
- **Row lifecycle**: a row disappears the moment its job resolves. The list
  only ever holds jobs still needing attention — never a history of completed
  ones. A successful job's `upload_jobs` row is deleted by the finalize stage.
- The list updates **live**, with no refresh, because `upload_jobs` is
  replicated by Zero and job-handler writes propagate exactly like user
  mutations, per
  [reactivity-propagation.md](../../research/system-architecture/reactivity-propagation.md).

## Extraction pipeline

- The pipeline is **pg-boss with separate chained jobs, one per stage**
  (extract → enrich → finalize), each with independent retry/failure handling,
  per
  [background-jobs.md](../../research/system-architecture/background-jobs.md).
- Jobs are enqueued **inside the same Postgres transaction** as the write that
  records the upload, via pg-boss's transactional send and its first-party
  Drizzle adapter — so a committed upload always has an enqueued job and vice
  versa.
- **The extract stage always creates the `articles` row**, success or failure,
  with best-effort fallbacks (`title` → the original filename, `authors` →
  `[]`) — so a failed job always has an article for #11 to open later.
- A **genuinely unparseable PDF is not retried**: the extract handler catches
  it explicitly and writes a terminal `status = 'failed'` with a reason string
  to `upload_jobs` and `extraction_status = 'failed'` on the article. Transient
  GROBID/Semantic Scholar failures (timeouts, 5xx) are left to pg-boss's own
  retry/backoff and never surface as `'failed'`.
- **Semantic Scholar enrichment failure is non-fatal**: the article is saved
  with GROBID-only data and `extraction_status = 'grobid_only'`, and the job
  still finalizes. An external, rate-limited API must not be able to fail an
  upload.
- The enrich stage writes **`citation_edges`** — one row per parsed
  bibliography entry, with `cited_article_id` resolved against *this user's*
  other articles by Semantic Scholar `paperId` first, falling back to
  normalized title + first author when neither side has an ID; unresolved
  entries are rows with a null `cited_article_id`. All matching is
  **per-user** — there is no cross-user canonical-paper dedup, per
  [citation-graph-schema.md](../../research/data-modeling/citation-graph-schema.md).

## Cross-cutting quality

- WCAG 2.2 AA throughout: 4.5:1 text / 3:1 non-text contrast in both themes,
  visible focus indicators on the "+" button, the status indicator, the modal's
  file picker and submit, and the header's avatar; discernible accessible names
  on all of them; the upload modal traps and restores focus and is
  keyboard-dismissible; the status popup is keyboard-reachable and its icon
  states are conveyed by more than color alone; valid heading structure with a
  main heading the focus handoff can target.
- Correct in both light and dark themes, with no flash of the wrong theme, and
  at narrow, mid, and wide widths — the app-shell layout's independently
  scrolling panels are exactly the kind of thing that breaks at one size only.
- Runs identically via `npm run dev` and the production Nitro server, and under
  `docker compose up` with the new zero-cache, Garage, and GROBID services.
- CI (Biome, typecheck incl. CSS-Module codegen and the `zero/schema.ts` drift
  check, unit + integration tests with ratchet coverage, Playwright e2e + axe,
  PR-title lint) passes.

## Explicitly out of scope

- **The full collection view** (card grid, user-defined tags, reading-status
  filter sidebar, live search, infinite scroll) — #8 upgrades the minimal
  surface this feature leaves; `tags`/`article_tags` are its tables, not this
  feature's.
- **The PDF reader and annotations** (#9) and the `annotations` table.
- **Citation-graph traversal UI** (#10). This feature writes `citation_edges`;
  nothing renders them yet.
- **Article edit** (#11) — which is why a failed upload's warning row can be
  seen but not cleared. See [description.md](./description.md).
- **Client-side Zero mutators.** `/mutate` ships as a real, authorized endpoint
  with an empty mutator registry; #8 is its first consumer. Nothing in this
  feature writes from the browser.
- **Author search against the `pg_trgm` index.** The generated column and index
  are created because the schema decision says so, but no query uses them —
  reactive search runs client-side against Zero's replica, per
  [article-core-schema.md](../../research/data-modeling/article-core-schema.md)'s
  own caveat.
- **LUKS on the Garage partition.** Host-level at-rest encryption is a
  deployment concern for nicbk-tower, not application code; see the note in
  [research.md](./research.md).
- **The general response-headers middleware** (CSP/HSTS/etc.) — still the same
  separate cross-cutting concern #6 deferred.
