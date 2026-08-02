# Constraints and Behavior: Semantic Scholar Enrichment

Which of the feature's acceptance criteria
([../../constraints-and-behavior.md](../../constraints-and-behavior.md)) this
task satisfies — the last of them.

## Satisfied here

**From "Sync engine and services":**

- `SEMANTIC_SCHOLAR_URL` is declared **required** in `src/env.ts` (so e2e can
  point it at the mock container) and `SEMANTIC_SCHOLAR_API_KEY` **optional**,
  both documented in `.env.example` and server-only.

**From "Schema" — completing it:**

- `citation_edges` is declared in Drizzle and migrated exactly as specified:
  denormalized `title`/`authors`/`publication_year`, nullable
  `cited_article_id` with **`ON DELETE SET NULL`**, `citing_article_id` and
  `user_id` with `ON DELETE CASCADE`, the
  `unique (citing_article_id, semantic_scholar_id)` constraint, and the three
  indexes. Additive.
- `zero/schema.ts` is regenerated and the drift check still passes.

**From "Extraction pipeline" — completing it:**

- The **enrich stage** is chained between extract and finalize, with its own
  retry/failure handling.
- Successful enrichment populates `semantic_scholar_id`, fills metadata GROBID
  missed, and sets `extraction_status = 'enriched'`.
- **Enrichment failure is non-fatal**: the article keeps
  `extraction_status = 'grobid_only'`, the job finalizes, and its row
  disappears normally. Failure here can never produce
  `upload_jobs.status = 'failed'`.
- The enrich stage writes **`citation_edges`** — one row per parsed
  bibliography entry, `cited_article_id` resolved against **this user's** other
  articles by S2 `paperId` first, falling back to normalized title + first
  author only when neither side has an ID; unresolved entries are rows with a
  null `cited_article_id`.
- Matching runs in **both directions**: a new edge checks existing articles, and
  a newly-uploaded article graduates existing unresolved edges.
- All matching is **per-user** — no cross-user canonical dedup.

**From "Cross-cutting quality":**

- CI passes, including the regenerated Zero schema check.

## Explicitly not satisfied here

- **Rendering the citation graph.** In-collection references, articles citing
  this one, not-in-collection entries, and the per-hop breadcrumb are **#10**.
  This task writes the data; nothing displays it.
- **Manual reference editing** — #11's article-edit, reusing this matching
  logic through the mutate path.
- **Clearing a failed upload's warning row** — still #11. Unchanged by this
  task, since enrichment failures never produce a failed job in the first
  place.

## Exit state

The feature is complete. Uploading a PDF yields an article with its metadata
extracted, enriched against Semantic Scholar where a match exists, and its
bibliography stored as edges — with any reference already in the collection
resolved, and any later upload graduating the edges that were waiting for it.
Semantic Scholar being down or throttled degrades this to a `grobid_only`
article, never a failed upload.
