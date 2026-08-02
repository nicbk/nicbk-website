# Status: GROBID Extraction Pipeline

**State:** Not started. Fourth of five; depends on `pdf-upload-and-storage`.

- Branch: `article-upload-and-extraction/grobid-extraction-pipeline` (to be
  created).
- Sub-issue: [#70](https://github.com/nicbk/nicbk-website/issues/70)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)),
  unassigned — self-assign before starting.
- PR: —

## Notes carried into implementation

- **The article row is created on extract completion, success or failure.** Not
  optional — a failed job must have an article for #11 to open. Fallbacks:
  `title` → original filename, `authors` → `[]`.
- **Two failure classes, handled differently.** Transient (timeout, 5xx) → left
  to pg-boss's retry/backoff, never written as `'failed'`. Unparseable/corrupt
  PDF → caught explicitly, terminal, not retried. Classify deliberately; both
  mistakes are bad in opposite ways.
- **Resolution is deletion, not a status value.** `upload_jobs` has no
  `'completed'` — the finalize stage deletes the row. That is what makes the
  popup hold only jobs needing attention.
- **Run our own GROBID**, never the public demo server (rate-limited, and the
  decided deployment model is self-hosted).
- **e2e never exercises real GROBID** — that gap is accepted and stated, which
  is exactly why the manual browser pass must use a real GROBID container and
  real papers.
- **Failure reasons are user-facing.** "couldn't find authors" is the decided
  example; write reasons a human can act on, not exception text.
- Re-verify pg-boss's current API and Drizzle adapter before writing code
  (12.26.4 at spec time).

## Log

- 2026-08-01 — Task defined during the feature spec. Fourth of five; not yet
  started.
