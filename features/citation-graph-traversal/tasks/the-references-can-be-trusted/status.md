# Status: The References Can Be Trusted

**State:** In review ([#202](https://github.com/nicbk/nicbk-website/issues/202)).

## What shipped

- **Columns** (migration `0006_references_read`):
  - `citation_edges.raw_text`
  - `articles.reference_count`
  - `articles.references_read_at`, which is not synced
- **Extraction** stores each reference's printed text and sets
  `references_read_at` on success.
- **Enrichment** asks Semantic Scholar for `referenceCount`, stores it, and runs
  the merged-row rule (`citations/merged-rows.ts`) once the reference list has
  been applied.

## Verified

- **The real rule over real rows.** `mergedRowIds` run over all 226 rows of the
  five local papers drops exactly:

  ```
  Understanding the difficulty of training deep feedforward neural networks. The handbook of brain theory and neural networks
  Convolutional networks for images, speech, and time series. The handbook of brain theory and neural networks
  ```
- **Integration tests** (real Postgres, Garage, pg-boss; Semantic Scholar
  stubbed):
  - the printed text survives Semantic Scholar's title replacing GROBID's;
  - an added row has none;
  - count and read time are stored;
  - a merged row is dropped and both halves are kept.
- **Mutation checks.** Each of these breaks fails a test:
  - not calling the rule
  - removing the 20-character floor
  - letting unresolved rows count as evidence
  - not protecting linked rows
  - not storing printed text
  - not writing the count
  - never setting the read time

## Log

- 2026-09-14 — Spec'd.
- 2026-09-14 — Implemented. The backfill moved to task 2 (#207), decided with
  the user.
