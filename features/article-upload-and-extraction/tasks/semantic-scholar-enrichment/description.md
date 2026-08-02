# Task: Semantic Scholar Enrichment

Fifth and last. Inserts a stage into a pipeline that already works, and lays
the citation graph's edges.

## What this task does

- **Adds `citation_edges`** to the Drizzle schema and migrates it, exactly as
  [citation-graph-schema.md](../../../../research/data-modeling/citation-graph-schema.md)
  specifies: denormalized `title`/`authors`/`publication_year` so an
  unresolved entry renders without a join, a nullable `cited_article_id` with
  **`ON DELETE SET NULL`**, `citing_article_id` and `user_id` with
  `ON DELETE CASCADE`, the `unique (citing_article_id, semantic_scholar_id)`
  constraint, and the three indexes. Additive — expand phase.
- **Builds the enrich stage**, chained between extract and finalize: match the
  extracted article against Semantic Scholar, populate `semantic_scholar_id`,
  fill in metadata GROBID missed, and promote `extraction_status` to
  `'enriched'`.
- **Writes the bibliography as edges** — one `citation_edges` row per entry
  task 4 already parses, with each entry's own S2 `paperId` resolved where
  available.
- **Implements graduation matching, in both directions**, per the decided rule
  — Semantic Scholar `paperId` first when both sides have one; falling back to
  exact match on `lower(trim(title))` plus the first author's `family` (or
  `name`) **only** when neither side has an ID:
  1. **New edge → existing articles**: each inserted edge checks this user's
     articles for a match and sets `cited_article_id` when one is found.
  2. **New article → existing edges**: uploading an article scans this user's
     unresolved edges (`cited_article_id IS NULL`) and graduates any that
     referenced it.
  All matching is **per-user**. There is no cross-user canonical-paper dedup,
  even when Semantic Scholar IDs match across accounts.
- **Keeps enrichment non-fatal.** If Semantic Scholar fails, times out, or
  throttles after retries, the article keeps `extraction_status = 'grobid_only'`
  and the job still finalizes and disappears. An external, rate-limited API must
  not be able to fail a user's upload.
- **Adds `SEMANTIC_SCHOLAR_URL`** (required, so e2e can point it at the mock
  container) and **`SEMANTIC_SCHOLAR_API_KEY`** (**optional** — the API works
  unauthenticated at a lower shared rate limit; a key just grants a dedicated
  one).

## Why last

The matching logic is written against resolved Semantic Scholar IDs, so the
edges and the enrichment that gives them meaning are one concern, not two.
Deferring the edges to #10 instead would mean re-opening this stage later and
backfilling every article uploaded in between — which is why the user chose to
populate them here.

Coming last also means this stage is inserted into a chain that is already
green: if the round-trip breaks, this task is what broke it.

## Not in this task

Rendering any of it. The citation-graph traversal UI — in-collection
references, articles citing this one, not-in-collection entries, and the
breadcrumb path that grows per hop — is **#10**. This task writes the data #10
reads.

Manual reference add/remove/correct is #11's article-edit, which reuses this
same matching logic through the normal mutate path.
