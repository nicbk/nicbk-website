# Upload Jobs Schema

Researched: 2026-07-05. Decided: 2026-07-05.

The `upload_jobs` table: the app-owned reactive status projection for the
PDF upload → GROBID extraction → Semantic Scholar enrichment pipeline
decided in
[background-jobs.md](../system-architecture/background-jobs.md), powering
[upload-status.md](../ui-ux/pages/lit-tracker/components/upload-status.md)'s
job-list popup. Unlike every other table in this category, rows here are
never client-created — only server-side job-handler code writes to it
(per `background-jobs.md`) — which changes how its primary key is
generated (see below). Follows the rest of the project-wide conventions in
[zero-schema-conventions.md](./zero-schema-conventions.md) (`timestamptz`
timestamps, hard deletes, `ON DELETE CASCADE` on ownership FKs,
Drizzle-declared schema) and reuses
[article-core-schema.md](./article-core-schema.md)'s object-key
convention.

## Decision

```sql
upload_jobs (
  id             uuid primary key default uuidv7(),  -- server-generated (Postgres 18 native);
                                                        -- doubles as the pre-allocated article ID, see below
  user_id        uuid not null references "user"(id) on delete cascade,

  filename       text not null,           -- original uploaded filename, for job-list row display

  status         text not null default 'processing',
                   -- 'processing' | 'failed'
  failure_reason text,                    -- set only when status = 'failed'

  article_id     uuid references articles(id) on delete cascade,
                   -- null until the extract stage creates the article row; always equals `id` once set

  pdf_object_key text not null,           -- lit-tracker/{user_id}/{id}/source.pdf

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
)
```

### `status` — two values, not a per-pipeline-stage enum

[background-jobs.md](../system-architecture/background-jobs.md)'s pipeline
has three stages (extract → enrich → finalize), but
[upload-status.md](../ui-ux/pages/lit-tracker/components/upload-status.md)'s
UI never distinguishes them: an in-progress job is just "filename plus a
progress indicator," with no extract-vs-enrich sub-state shown. And
Semantic Scholar enrichment failures are explicitly **non-fatal** — the
article is still saved (marked `grobid_only`) and the job proceeds to
completion — so `'failed'` can only ever originate from the GROBID
extraction stage catching a genuinely bad/corrupt PDF, per
`background-jobs.md`'s own scoping of that terminal case. There is no
third value to encode.

pg-boss's own transient retry/backoff (for GROBID/Semantic Scholar
timeouts and 5xx errors) is handled entirely internally to the queue
library — that's a private implementation detail of "the job hasn't
reached a terminal outcome yet," not something the reactive `status`
column needs to expose.

### No `'completed'`/`'resolved'` value — the row is deleted on resolution

[upload-status.md](../ui-ux/pages/lit-tracker/components/upload-status.md)
is explicit: a job's row disappears from the list immediately once it
resolves, and the list only ever contains jobs still needing attention —
"never a lingering history of completed ones." Combined with this
project's hard-delete convention
([zero-schema-conventions.md](./zero-schema-conventions.md) — no
soft-delete/tombstones anywhere), the natural fit is to delete the row
outright on resolution rather than add a terminal status value that every
query has to filter back out:

- **Success**: the finalize stage deletes its own `upload_jobs` row once
  the article is fully saved (whether `enriched` or `grobid_only` —
  both are non-failure outcomes from the job's perspective).
- **Failure, resolved**: [article-edit.md](../ui-ux/pages/lit-tracker/components/article-edit.md)'s
  save/delete mutate handlers delete the associated `upload_jobs` row
  (identified via its `article_id`) once the user fixes the missing
  fields or deletes the article — ordinary write-path logic in those
  handlers, not a DB trigger.

### The article row is created on extract completion — success or failure

For [upload-status.md](../ui-ux/pages/lit-tracker/components/upload-status.md)'s
"Problem articles in the job list popup open in `article-edit.md`" to hold
unconditionally (not just for some failures), the `articles` row must
exist by the time a job reaches `'failed'`, not only on full success. So
the GROBID-stage handler always creates the article row once it finishes,
using best-effort fallbacks for anything it couldn't extract — `title`
falls back to the original filename, `authors` falls back to `[]` — and
sets `extraction_status = 'failed'` on that row (per
[article-core-schema.md](./article-core-schema.md)) when required data
(e.g. authors) is missing, which is exactly the "couldn't find authors"
example `upload-status.md` gives. `article_id` on `upload_jobs` is null
only during the brief window before this stage runs.

### `id`/`article_id`/`pdf_object_key` — pre-allocating the article's ID

The PDF has to land in blob storage *before* GROBID (and thus before the
`articles` row) exists, but
[article-core-schema.md](./article-core-schema.md)'s object-key
convention is `{user_id}/{article_id}/source.pdf` — keyed by an ID that
doesn't exist yet at upload time. Rather than deviating from that already
-decided convention or moving/copying the blob later, `upload_jobs.id`
itself is generated at upload time and used as the pre-allocated ID for
the *future* article: the PDF is written to
`lit-tracker/{user_id}/{id}/source.pdf` immediately, and once the extract
stage actually inserts the `articles` row, it's inserted with that exact
same ID value (Postgres allows specifying a primary key value explicitly
on insert). `upload_jobs.article_id` is then set to match — a real,
nullable FK column (not a bare shared-ID relation) specifically so
`ON DELETE CASCADE` still gives automatic cleanup if the article is later
deleted, which a shared-PK-only design couldn't provide.

`pdf_object_key` is stored as its own column on `upload_jobs` (rather than
computed on the fly from `id`) for the same reason
[article-core-schema.md](./article-core-schema.md) stores its own copy
rather than deriving it at read time: the job handler needs a stable
value to hand to GROBID regardless of the naming convention's exact
shape. No blob copy/move ever happens — the article's own
`pdf_object_key` (set once the row is inserted) is simply the same string
value, carried over verbatim.

### `id` generation — Postgres's native `uuidv7()`, not client-generated

Every other table in this category uses a **client-generated** UUIDv7
(via the `uuid` npm package), per
[zero-schema-conventions.md](./zero-schema-conventions.md), specifically
to support Zero's optimistic-create UX — the client needs an ID before
the round-trip to the server. `upload_jobs` rows are never created via a
client Zero mutation at all (per
[background-jobs.md](../system-architecture/background-jobs.md), only
server-side job-handler code writes to this table), so that rationale
doesn't apply here. Postgres 18 added a native, extension-free
`uuidv7()` builtin — generated IDs sort in roughly time order (avoiding
the same B-tree fragmentation client UUIDv4s would cause) and collision
risk under concurrent inserts is negligible (comparable to UUIDv4),
making it a safe `DEFAULT` for a server-only-inserted primary key. Using
it here avoids adding app code whose only job would be generating an ID
before an INSERT that's already happening entirely server-side. This is
called out as an explicit exception in
[zero-schema-conventions.md](./zero-schema-conventions.md) rather than
left as an undocumented inconsistency.

### Foreign keys — both ownership, both `ON DELETE CASCADE`

Per [zero-schema-conventions.md](./zero-schema-conventions.md)'s FK
convention: `user_id` is a standard ownership FK. `article_id` is too,
once set — a job row exists purely to track a specific article's
extraction progress/outcome; if that article is deleted, the job has
nothing left to mean, so it should be deleted along with it rather than
left pointing at nothing.

## Sources

- [postgresql.org — PostgreSQL 18 Release Notes](https://www.postgresql.org/docs/current/release-18.html),
  [postgresql.org — UUID Functions (v18)](https://www.postgresql.org/docs/18/functions-uuid.html) —
  confirms `uuidv7()` is a native, extension-free builtin added in
  Postgres 18, safe as a `DEFAULT` on a primary key, plus
  `uuid_extract_timestamp()`'s v7 support.
- [thenile.dev — UUIDv7 Comes to PostgreSQL 18](https://www.thenile.dev/blog/uuidv7) —
  monotonicity/collision-risk characteristics of Postgres's native
  `uuidv7()` implementation under concurrent inserts.
