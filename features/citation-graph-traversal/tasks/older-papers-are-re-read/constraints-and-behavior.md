# Constraints and Behavior: Older Papers Are Re-read

The feature's **Older papers are re-read** behavior and **Data** constraints,
plus:

- **Its own job, not extraction run again.** Extraction overwrites the article's
  title and authors, which a reader may have corrected (#11). The re-read reads
  the stored PDF, rewrites only the bibliography (then Semantic Scholar's list,
  the merged-row rule, the count, graduation), and sets `references_read_at`.
- **Queued on worker start**, for articles whose extraction finished
  (`grobid_only` or `enriched`), with no `references_read_at`, and no upload
  still in progress. A second start while jobs are queued adds none.
- **Its state is synced data**, owner-scoped like `upload_jobs`, so the
  indicator shows it without polling. It is a separate record from uploads:
  the upload row's failure opens the fix dialog and is retired by editing
  details, and neither applies to a re-read.
- **Try again** is an owner-checked mutator plus a server effect that queues the
  jobs, the same pattern as deleting an article's PDF.
- **Nothing is lost on failure.** The bibliography is replaced in one
  transaction only once GROBID has answered.

## Acceptance

Feature criterion 6, for existing papers.
