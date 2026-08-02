# Status: Semantic Scholar Enrichment

**State:** Not started. Fifth of five; depends on `grobid-extraction-pipeline`.
Completes the feature.

- Branch: `article-upload-and-extraction/semantic-scholar-enrichment` (to be
  created).
- Sub-issue: [#71](https://github.com/nicbk/nicbk-website/issues/71)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)),
  unassigned — self-assign before starting.
- PR: —

## Notes carried into implementation

- **Enrichment failure is non-fatal, always.** No Semantic Scholar outcome may
  produce `upload_jobs.status = 'failed'`. The article degrades to
  `grobid_only` and the job finalizes normally.
- **Matching is ID-first, and the fallback is narrow.** S2 `paperId` when both
  sides have one; exact normalized title + first-author **only** when *neither*
  side has an ID. It is not a fuzzy score, and differing IDs mean *not a
  match*, whatever the titles say.
- **Match in both directions.** New edge → existing articles, and new article →
  existing unresolved edges. The second is the one that gets forgotten.
- **Per-user only.** No cross-user canonical dedup, even on identical S2 IDs.
  Test it non-vacuously, with another user's matching article present.
- **No API key required.** `SEMANTIC_SCHOLAR_API_KEY` is optional; the API
  works unauthenticated against a shared rate limit. Do not make it required —
  that was verified at spec time, not assumed.
- **`SEMANTIC_SCHOLAR_URL` must be configurable**, because e2e swaps it to the
  mock container. Same for `GROBID_URL` in task 4.
- **Re-extraction is delete-and-reinsert**, not upsert; the unique constraint
  is for integrity, not as an upsert mechanism.
- **Nothing renders the edges** — #10 does. Verify them in the data.

## Log

- 2026-08-01 — Task defined during the feature spec. Fifth of five; not yet
  started. Populating `citation_edges` here rather than deferring to #10 was a
  user decision at spec time: the enrich stage already resolves the references,
  and deferring would mean re-opening it later plus backfilling every article
  uploaded in the meantime.
