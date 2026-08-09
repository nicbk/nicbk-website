# Constraints and Behavior: GROBID Extraction Pipeline

Which of the feature's acceptance criteria
([../../constraints-and-behavior.md](../../constraints-and-behavior.md)) this
task satisfies.

## Satisfied here

**From "Sync engine and services":**

- **GROBID** exists as a long-lived Compose container on the same host,
  exposing its synchronous REST API, pinned to a version tag.

  **Revision (2026-08-08):** the "~4 GB RAM footprint is accepted" written here
  described the `-full` image. The stack runs **`0.9.1-crf`** instead — ~500 MB
  rather than ~8 GB, CPU-only, and materially lighter at runtime — confirmed
  with the user. The cost is 2–5 F1 points on citations/references, which lands
  in task 5 rather than here; see [status.md](./status.md) for the full
  reasoning and why it is reversible.
- `GROBID_URL` is declared in `src/env.ts`, documented in `.env.example`, and
  server-only.

**From "Schema":**

- pg-boss's `pgboss` schema stays excluded from the publication Zero
  replicates — established in task 1, and this is the task that makes it load
  bearing by actually creating those tables.

**From "Authorization and data isolation":**

- **PDF reads are proxied through the app server**, ownership-checked, with no
  presigned URL — the read half of the storage path, first needed here.

**From "Extraction pipeline" — most of it:**

- The pipeline is **pg-boss with separate chained jobs, one per stage**, each
  with independent retry/failure handling. Extract and finalize exist here;
  enrich is inserted between them in task 5.
- **The extract stage always creates the `articles` row**, success or failure,
  with the decided best-effort fallbacks (`title` → original filename,
  `authors` → `[]`), adopting the pre-allocated ID the PDF is stored under.
- A **genuinely unparseable PDF is not retried**: it is caught explicitly and
  written as terminal `upload_jobs.status = 'failed'` with a reason string, and
  `extraction_status = 'failed'` on the article.
- **Transient GROBID failures** (timeouts, 5xx) are handled by pg-boss's retry
  and backoff and never surface as `'failed'`.

**From "Upload status indicator" — the resolution half, completing it:**

- **A row disappears the moment its job resolves.** The finalize stage deletes
  the `upload_jobs` row on success, so the list holds only jobs still needing
  attention — never a history of completed ones.
- A failed job's row remains, showing filename, a warning icon, and the failure
  reason.

**From "Upload flow" — completing it:**

- The new article carries reading status **`pending`**, inherited from the
  column default.

**From "Cross-cutting quality":**

- The stack runs under `docker compose up` with the GROBID service; CI passes.

## Explicitly not satisfied here

- **Semantic Scholar enrichment**, `semantic_scholar_id`, and
  `extraction_status = 'enriched'` — task 5.
- **`citation_edges`.** The bibliography is parsed here and validated by unit
  tests, but the table does not exist until task 5 and no edges are written.
- **Clearing a failed job's warning row.** That needs `article-edit` (#11),
  which depends on this feature. The row stands; see
  [../../description.md](../../description.md).

## Exit state

A signed-in user uploads a real PDF and, without touching the browser, watches
the job row appear, progress, and disappear as a real article takes its place —
title, authors, abstract, year, venue, and DOI extracted, with
`extraction_status = 'grobid_only'` and reading status `pending`. A PDF GROBID
cannot parse instead leaves a warning row naming the reason, with its article
row present behind it.
