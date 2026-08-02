# Testing: Semantic Scholar Enrichment

What this task's tests must cover. Tiers and tooling are the feature's
([../../testing.md](../../testing.md)).

Semantic Scholar fixtures are **hand-authored JSON** — the decided approach;
the response shapes are simple and stable enough that record-replay tooling
would be overhead.

## Unit (Vitest, MSW for in-process HTTP)

- **Matching** (pure) — the highest-value tests in this task, because the rule
  is specific and easy to get subtly wrong:
  - Both sides have a `paperId` and they are equal → match.
  - Both sides have a `paperId` and they differ → **no** match, even if the
    titles are identical. The ID wins; the fallback must not run.
  - Neither side has a `paperId`, titles agree after `lower(trim(...))`, and
    the first author's `family` (or `name`) agrees → match.
  - Only one side has a `paperId` → the fallback does **not** apply.
  - Titles differing only by case or surrounding whitespace still match;
    genuinely different papers do not.
- **Response mapping** (pure): an S2 response maps to `semantic_scholar_id` and
  the metadata fields; a response missing optional fields leaves the
  GROBID-extracted values intact rather than overwriting them with nulls.
- **Non-fatal classification** (pure): a timeout, a 429, and a 5xx all classify
  as non-fatal — none of them can produce a terminal job failure.
- **Env schema:** `SEMANTIC_SCHOLAR_URL` is required and validated;
  **`SEMANTIC_SCHOLAR_API_KEY` parses when absent** — assert the optionality
  directly, since treating it as required would break unauthenticated use.

## Integration (Vitest + Testcontainers Postgres, S2 stubbed in-process)

- **Migration** applies cleanly, producing `citation_edges` with its three
  indexes and the `unique (citing_article_id, semantic_scholar_id)` constraint.
- **Enrich success:** `semantic_scholar_id` populated, missing metadata filled,
  `extraction_status` promoted to `'enriched'`, and one edge row per
  bibliography entry.
- **Enrich failure is non-fatal:** with the stub failing after retries, the
  article stays `grobid_only`, the job still finalizes, and its row is deleted.
  Assert `upload_jobs.status` never became `'failed'` — that is the property
  the decision actually protects.
- **Graduation, direction 1:** an edge whose referenced paper is already in the
  user's collection is inserted with `cited_article_id` set.
- **Graduation, direction 2:** uploading an article that an existing
  unresolved edge referenced updates that edge's `cited_article_id`. This is
  the direction easiest to forget, and the decided rule requires both.
- **Per-user scoping, non-vacuously:** an edge does **not** resolve against
  another user's article even when the Semantic Scholar IDs match exactly —
  with that other user's article genuinely present, so the test cannot pass by
  finding nothing.
- **`ON DELETE SET NULL`:** deleting a cited article reverts its edges to
  unresolved placeholders rather than deleting the citing article's
  bibliography; deleting the **citing** article cascades its edges away.
- **Account-deletion cascade** now covers `citation_edges` too, completing the
  chain #6 could not test.
- **Unresolved entries render from their own columns:** an edge with a null
  `cited_article_id` still carries the `title`/`authors`/`publication_year`
  needed to display it without a join.

## End-to-end (Playwright, S2 mocked via the mock-server container)

Pointed at the same WireMock/MockServer container as GROBID, by config swap.

- **Enriched round-trip:** with both stubs responding, an upload resolves to an
  article whose enriched metadata is visible, live, with no reload.
- **Degraded round-trip:** with the S2 stub failing, the same upload still
  resolves to an article and the job row still disappears — no failure state
  reaches the user. This is the behavior most worth locking in, because it only
  breaks in production conditions nobody tests by hand.

## Accessibility

No new UI, so no new axe surface. Re-run the existing scans to confirm nothing
regressed.

## Framework caveats to carry

- Retrying matchers with generous timeouts; the chain is now three stages long.
- Judge the suite with `npm run test:e2e:prod`.

## Browser verification (manual, recorded in status.md)

- Upload **real** papers that cite each other and confirm the graduation
  actually happened in the data — upload A, then upload something A cites, and
  check the waiting edge resolved. That round-trip is the whole reason the
  matching runs in both directions, and it is invisible in the UI until #10.
- Confirm a real Semantic Scholar lookup succeeds unauthenticated at this
  project's volume, since no API key is configured by default.
- Confirm that with `SEMANTIC_SCHOLAR_URL` pointed at something unreachable,
  uploads still complete as `grobid_only`.
