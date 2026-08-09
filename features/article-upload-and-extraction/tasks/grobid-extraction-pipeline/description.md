# Task: GROBID Extraction Pipeline

Fourth of five. The task that makes an upload become an article.

## What this task does

- **Adds the pg-boss worker** that drains the queue, consuming the jobs task 3
  already enqueues transactionally, and **adds GROBID** as a long-lived Compose
  container exposing its synchronous REST API.

  (An earlier draft said this task "adds pg-boss". It does not — task 3 added
  it, along with the queue and the transactional send. What arrives here is the
  handler on the other end.)
- **Builds the extract stage**: fetch the PDF back from Garage through the app
  server's own proxied read path, POST it to GROBID's full-text endpoint, and
  parse the returned TEI-XML into title, authors (with structured
  `given`/`family` where `persName` provides them), abstract, publication year,
  venue, DOI, and the parsed bibliography entries.
- **Always creates the `articles` row** when the stage finishes — success *or*
  failure — using the pre-allocated ID the PDF was already stored under, with
  best-effort fallbacks (`title` → the original filename, `authors` → `[]`).
  This is a decided requirement, not a convenience: a failed job must have an
  article behind it so #11 has something to open.
- **Builds the finalize stage**, which deletes the resolved `upload_jobs` row.
  Because the row is deleted rather than marked complete, the status popup
  empties itself with no "completed" state to filter out — which is exactly
  what the decided row lifecycle asks for.
- **Handles the two failure classes differently**, per the decided pipeline
  design:
  - A **transient** GROBID failure (timeout, 5xx) is left to pg-boss's own
    retry and backoff. It never reaches the reactive `status` column, because
    the job simply has not reached a terminal outcome yet.
  - A **genuinely unparseable or corrupt PDF** is caught explicitly and written
    as terminal `upload_jobs.status = 'failed'` with a short reason string
    (e.g. "couldn't find authors"), plus `extraction_status = 'failed'` on the
    article. It is **not** retried.
- **Adds the proxied PDF read path** — the first thing that needs to fetch a
  stored object back, authorized and ownership-checked like every other read.

## Why this ships a complete pipeline, not a stub

`extraction_status = 'grobid_only'` is already a **legitimate terminal
outcome** in the decided schema, not a placeholder for missing enrichment. So
this task ends with a pipeline that genuinely works end to end: a PDF becomes a
real article with its metadata extracted, and the job row disappears. Task 5
then inserts a stage into a chain that is already green, rather than completing
a half-built one.

It also keeps a self-hosted container and a rate-limited external API in
separate reviews, which are different operational concerns.

## Not in this task

Semantic Scholar, `semantic_scholar_id`, `citation_edges`, and the
`extraction_status = 'enriched'` outcome — all task 5. The bibliography entries
parsed here are extracted and validated but not yet persisted as edges; task 5
adds the table and writes them.

Clearing a failed job's warning row still needs `article-edit` (#11), which
depends on this feature. The row stands until then, by design.
