# Citation Graph Schema

Researched: 2026-07-05. Decided: 2026-07-05.

The `citation_edges` table: one row per bibliography entry parsed from a
citing article's PDF, supporting
[citation-graph.md](../technologies/citation-graph.md)'s directed-graph
model ("in collection / not in collection" as a per-node attribute) and its
3 traversal modes in
[citation-graph.md (component)](../ui-ux/pages/lit-tracker/components/citation-graph.md).
Follows the project-wide conventions in
[zero-schema-conventions.md](./zero-schema-conventions.md) (UUIDv7 PKs,
`timestamptz` timestamps, hard deletes, `ON DELETE CASCADE`/`SET NULL`
conventions, Drizzle-declared schema) and reuses
[article-core-schema.md](./article-core-schema.md)'s `authors` jsonb shape
and `semantic_scholar_id` column.

## Decision

```sql
citation_edges (
  id                  uuid primary key,        -- client-generated UUIDv7
  user_id             uuid not null references "user"(id) on delete cascade,
  citing_article_id   uuid not null references articles(id) on delete cascade,
  cited_article_id    uuid references articles(id) on delete set null,
                        -- null = "not in collection" placeholder;
                        -- set once/if "graduated" — see below

  title               text not null,
  authors             jsonb not null,          -- same shape as articles.authors
  publication_year    integer,
  semantic_scholar_id text,                    -- nullable, referenced paper's S2 paperId

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (citing_article_id, semantic_scholar_id)
)

create index citation_edges_citing_idx on citation_edges (citing_article_id);
create index citation_edges_cited_idx on citation_edges (cited_article_id);
create index citation_edges_user_s2_idx on citation_edges (user_id, semantic_scholar_id)
  where cited_article_id is null;
```

### Table naming — `citation_edges`, not `references`

`REFERENCES` is a reserved Postgres/SQL keyword (used in FK-constraint
syntax) — using it as a bare table name would force quoting everywhere
(hand-written queries, Drizzle/`drizzle-zero` generation), pure friction
for no benefit. `citation_edges` was chosen over `citations` (could read as
a citation-*count* concept) and `bibliography_entries` (undersells that
resolved rows do point back into `articles`).

### Single-table design — a placeholder is just a row with `cited_article_id IS NULL`

No separate "placeholder" entity exists. Every bibliography entry parsed
from a citing article's PDF becomes one `citation_edges` row immediately,
with denormalized metadata (`title`/`authors`/`publication_year`,
`authors` reusing `articles.authors`'s exact jsonb shape) for display
regardless of whether the referenced paper is in the collection.
"Graduation" — the referenced paper turning out to also be in the user's
collection — is nothing more than `UPDATE citation_edges SET
cited_article_id = $1 WHERE id = $2`; there's no data migration or entity
transition, just filling in a previously-null FK.

All 3 traversal modes from
[citation-graph.md (component)](../ui-ux/pages/lit-tracker/components/citation-graph.md)
are direct queries against this one table:

- **In-collection references of article A**: `WHERE citing_article_id = A
  AND cited_article_id IS NOT NULL`, joined to `articles` on
  `cited_article_id` for display.
- **Articles citing A**: `WHERE cited_article_id = A`, joined to `articles`
  on `citing_article_id` — this is just the same table queried in the
  reverse direction, not a separately-maintained inverse index.
- **Not-in-collection references of A**: `WHERE citing_article_id = A AND
  cited_article_id IS NULL` — these rows render from their own
  `title`/`authors`/`publication_year` columns directly, with no join,
  matching the spec's "not clickable, bare metadata only" requirement.

### Graduation matching — Semantic Scholar ID first, normalized title+author fallback

When a new article is uploaded (or an existing edge's metadata is
corrected — see below), matching against this same user's other data
follows Semantic Scholar's own documented bibliography-linking practice
(match by canonical ID first; only fall back to title/author agreement
when no ID is available on either side — not a fuzzy-scoring algorithm):

1. **Primary**: `citation_edges.semantic_scholar_id = articles.semantic_scholar_id`,
   both non-null, both scoped to the same `user_id`.
2. **Fallback**, only when the edge has no `semantic_scholar_id` (permanently
   GROBID-only) and a candidate article also lacks one: exact match on
   `lower(trim(title))` plus the first author's `family` (or `name` when
   `family` isn't available). Chosen over "S2-ID-only, no fallback" —
   the simpler, zero-false-positive-risk alternative — specifically to
   catch GROBID-only-vs-GROBID-only matches that would otherwise never
   graduate even when they're clearly the same paper; this is a deliberate
   user preference given the small false-positive risk is acceptable here.

This matching check runs both directions: when a new article uploads,
scan this user's unresolved edges (`cited_article_id IS NULL`) for a match
against the new article; when a new edge is inserted (extraction, or a
manual add via `article-edit.md`), check this user's existing `articles`
for a match against it.

### Idempotency on re-extraction — delete-and-reinsert, no extra constraint needed

If an article's extraction ever re-runs, its citing-side edges are
deleted and reinserted within one transaction rather than upserted —
re-running a *finished* extraction isn't an actual workflow anywhere in
[background-jobs.md](../system-architecture/background-jobs.md) (retries
there are pipeline-stage-level for a not-yet-successful run), so adding a
secondary dedup key (e.g. on title, for S2-ID-less entries) would be
solving a problem that isn't confirmed to exist. The
`unique (citing_article_id, semantic_scholar_id)` constraint above exists
for data integrity (no duplicate edge to the same resolved paper), not as
an upsert mechanism.

### Manual reference editing — same table, same mutate-handler path

[article-edit.md](../ui-ux/pages/lit-tracker/components/article-edit.md)'s
reference add/remove/correct operations are normal writes to
`citation_edges` through the standard mutate-handler path, no
special-casing: adding a reference is an `INSERT` (running the graduation
match above at write time), removing is a `DELETE`, and correcting a
placeholder's `title`/`authors`/`publication_year` is an `UPDATE` that
re-runs the graduation-match check afterward — the same matching logic,
just triggered by a manual edit instead of the extraction pipeline.

### Foreign keys — one ownership, one soft reference

Per [zero-schema-conventions.md](./zero-schema-conventions.md)'s FK
convention: `user_id` and `citing_article_id` are `ON DELETE CASCADE`
(this row is part of — owned by — the citing article's bibliography, and
by the user's account). `cited_article_id` is `ON DELETE SET NULL`:
deleting the *cited* article should revert this edge to an unresolved
placeholder, not delete the citing article's bibliography entry — the
citing article still cited that paper, whether or not it remains in this
user's collection.

## Sources

- [postgresql.org — SQL Key Words](https://www.postgresql.org/docs/current/sql-keywords-appendix.html) —
  confirms `REFERENCES` is a reserved key word.
- [Semantic Scholar / S2ORC bibliography-linking methodology](https://www.semanticscholar.org/product/api) —
  canonical-ID-first, title/author-agreement-fallback as the standard,
  non-fuzzy approach to resolving bibliography entries against known
  papers.
