# Article Core Schema

Researched: 2026-07-05. Decided: 2026-07-05.

The `articles` table: the core row representing one uploaded paper in one
user's lit-tracker collection. Follows the project-wide conventions in
[zero-schema-conventions.md](./zero-schema-conventions.md) (UUIDv7 PKs,
`timestamptz`/`number()` timestamps, hard deletes, `ON DELETE CASCADE` on
ownership FKs, Drizzle-declared schema) and
[../system-architecture/data-sharing-boundaries.md](../system-architecture/data-sharing-boundaries.md)'s
already-decided `user_id` FK pattern (applied here, not re-derived).

## Decision

```sql
articles (
  id                 uuid primary key,        -- client-generated UUIDv7
  user_id            uuid not null references "user"(id) on delete cascade,

  title              text not null,
  authors            jsonb not null,          -- [{ name, given?, family? }, ...]
  authors_search     text generated always as (
                       lower(jsonb_path_query_array(authors, '$[*].name')::text)
                     ) stored,
  publication_year   integer,
  venue              text,
  doi                text,
  abstract           text,
  notes              text,

  pdf_object_key     text not null,           -- Garage/S3 key, see below
  semantic_scholar_id text,                   -- nullable, S2 paperId

  status             text not null default 'pending',
                       -- 'pending' | 'reading' | 'read'
  extraction_status  text not null default 'pending',
                       -- 'pending' | 'grobid_only' | 'enriched' | 'failed'

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
)

create extension if not exists pg_trgm;
create index articles_authors_search_trgm_idx
  on articles using gin (authors_search gin_trgm_ops);
```

Required fields: `title`, `authors` (per
[article-edit.md](../ui-ux/pages/lit-tracker/components/article-edit.md)).
Everything else — `publication_year`, `venue`, `doi`, `abstract`, `notes` —
is optional/nullable.

### Authors — `jsonb` array, not a normalized table

`authors: jsonb` stores `{ name: string; given?: string; family?: string }[]`.
`name` is always populated (used for every display case: the collection-view
card's title/"et al." truncation, citation-graph list items); `given`/
`family` are populated when GROBID's TEI output provides structured
`persName`/`forename`/`surname` data, but aren't required. This same object
shape is directly reusable by
[citation-graph-schema.md](./citation-graph-schema.md)'s bare-metadata
"not in collection" placeholder entries.

Rejected: a normalized `authors` + `article_authors` join table (the
Zotero precedent). Zotero's own schema normalizes creators specifically to
support cross-item author browsing/autocomplete in a *shared* library —
a feature this project doesn't have (data is per-user, already decided in
`data-sharing-boundaries.md`, with no cross-user dedup — see
`citation-graph-schema.md`'s note). Search here is a substring match over
already-synced data, not a server-side relational query, so a join table
would add real write-side complexity (maintaining the join on every
article edit) to solve a problem this project doesn't have.

### Author search — a generated, indexed `authors_search` column

To keep future author-based search easy without over-engineering it now,
`authors_search` is a Postgres `generated always as (...) stored` column
extracting and lowercasing every author's `name` from the `authors` jsonb,
indexed with a `pg_trgm` GIN index (trigram matching, not full-text/
`tsvector`) — trigram indexes support `ILIKE '%partial%'`/fuzzy matching
directly, the right shape for "user types part of a name," whereas a
`tsvector`/full-text index stems and tokenizes words, a poor fit for proper
names. This adds no schema disruption if/when author search becomes a real
feature later — it would just be a new query against a table shape that
hasn't changed.

**This is why [database.md](../technologies/database.md)'s Postgres
version floor was bumped to v18+.** Zero's own docs state `generated ...
stored` columns only replicate to the client on Postgres 18+; on lower
versions they silently don't sync. Since a DB-generated column is exactly
what's needed here (vs. an app-code-maintained duplicate column), the
project-wide minimum version was raised rather than working around the
limitation.

**Important caveat on where this index actually helps**: Zero evaluates
`ILIKE` filters in one of three places — in-memory on the client, against
the client's local SQLite replica ("ZQLite"), or as real SQL executed
directly against Postgres. A live/reactive `useQuery` search-as-you-type
hits the first two, neither of which is Postgres — so this `pg_trgm` index
is invisible to the primary reactive search UX, and isn't needed for it to
feel instant at this project's personal-collection scale. Its value is for
a possible future *server-side* search path (e.g. a synced query that runs
literal SQL against Postgres rather than the client replica) — it's cheap
insurance for that case, not a requirement for the reactive path to work.

### Reading status — a plain column, not a tags-table concept

`status: 'pending' | 'reading' | 'read'`, `not null default 'pending'`,
directly on `articles`. [collection-view.md](../ui-ux/pages/lit-tracker/pages/collection-view.md)'s
"unified model" language (reading status "modeled as three special
built-in tags rather than a separate concept") only prescribes *UI/
interaction* behavior — one visual filter mechanism, mutually exclusive,
non-renamable — not a specific backing schema; see
[tags-and-reading-status.md](./tags-and-reading-status.md) for the full
reasoning on why a column beats modeling status as real tag rows (no
seeding, no protected-row trigger, no denormalized join column — mutual
exclusivity is a free property of a single column). The sidebar's 3
status buttons are synthesized in the UI layer to render identically to
real tag buttons; `tags`/`article_tags` (that doc) are reserved for actual
user-defined tags only.

### Extraction/enrichment status — persisted enum on the row

`extraction_status: 'pending' | 'grobid_only' | 'enriched' | 'failed'`,
updated by the background job pipeline
([background-jobs.md](../system-architecture/background-jobs.md)) as it
progresses. This is necessary, not optional: `upload-status.md`
already decided that a resolved job's row disappears from the reactive
job-list popup — so once a GROBID-only article's job resolves, nothing in
`upload_jobs` remembers "this one was never enriched." If the UI ever wants
a subtle "not enriched" indicator after that point, the fact has to live on
the article row itself. The job table tracks the *process*; this column
remembers the *outcome*.

### PDF blob reference — a stable object key, not a URL

`pdf_object_key: text`, following the convention
`lit-tracker/{user_id}/{article_id}/source.pdf` — the high-cardinality
`user_id` segment goes first, per AWS's own guidance for multi-tenant
bucket key design (partition/request distribution). At read time the app
server streams the object to the client by proxying it through itself; no
URL is ever persisted, and — per
[../security-privacy/pdf-and-annotation-data-protection.md](../security-privacy/pdf-and-annotation-data-protection.md)
— no presigned/signed Garage URL is issued to clients either, so every
read stays behind the app server's own authorization checks rather than a
bearer-token-style URL. The stored value is only ever this stable object
key, which fits the private-by-default, multi-tenant model already decided.

### Semantic Scholar ID — nullable column, for per-user matching only

`semantic_scholar_id: text`, nullable, populated only on successful
enrichment, storing S2's `paperId` (not the numeric `corpusId` — no current
need for it). Confirmed useful despite the project's no-global-dedup
decision (`data-modeling/index.md`): `citation-graph-schema.md`'s matching
logic can compare a reference's resolved `paperId` against this same
user's *other* `articles.semantic_scholar_id` values (scoped by `user_id`)
to detect "is this reference already in my collection" — a per-user match,
not cross-user dedup.

### Abstract/notes — plain `text`, no nuance missed

Both `abstract` and `notes` are plain `text` columns. Postgres's own docs
confirm no performance difference between `text` and `varchar` — a length
constraint isn't warranted for either field.

## Sources

- [grobid.readthedocs.io — TEI encoding of results](https://grobid.readthedocs.io/en/latest/TEI-encoding-of-results/) —
  `persName`/`forename`/`surname` structured author output.
- [github.com/zotero/zotero — userdata.sql](https://github.com/zotero/zotero/blob/main/resource/schema/userdata.sql) —
  Zotero's normalized `creators`/`itemCreators` precedent, and why its
  rationale (shared-library cross-item browsing) doesn't apply here.
- [pganalyze.com — Postgres GIN indexes](https://pganalyze.com/blog/gin-index),
  [postgresql.org — pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html) —
  trigram GIN indexing for `ILIKE`/fuzzy matching vs. full-text `tsvector`.
- [crunchydata.com — Indexing JSONB in Postgres](https://www.crunchydata.com/blog/indexing-jsonb-in-postgres),
  [tselai.com — generated columns](https://tselai.com/virtual-gencolumns) —
  generated-column extraction patterns over jsonb.
- [zero.rocicorp.dev/docs/postgres-support](https://zero.rocicorp.dev/docs/postgres-support) —
  confirms `generated ... stored` columns only replicate on Postgres 18+,
  the reason `database.md`'s version floor was bumped.
- Zero's ZQL docs — confirms `ILIKE` is evaluated client-side (in-memory or
  against the ZQLite replica) or "as SQL in Postgres," and that only the
  latter path can use a Postgres-side index.
- [docs.aws.amazon.com — Naming Amazon S3 objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html),
  [repost.aws — S3 object key naming pattern](https://repost.aws/knowledge-center/s3-object-key-naming-pattern) —
  multi-tenant object-key convention (`user_id` segment first).
- [semanticscholar.org — API tutorial](https://www.semanticscholar.org/product/api/tutorial) —
  `paperId` vs. `corpusId` identifiers.
- [postgresql.org — Character Types](https://www.postgresql.org/docs/current/datatype-character.html) —
  `text` vs. `varchar` performance parity.
