# Research: Data Modeling

Status: 6/6 researched and decided (2026-07-05).

Schema/shape design for data shared reactively across sub-applications via
Zero (see [../technologies/sync-engine.md](../technologies/sync-engine.md)),
especially the citation graph in the lit-tracker
(see [lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md)).
Builds on [../system-architecture/data-sharing-boundaries.md](../system-architecture/data-sharing-boundaries.md)'s
multi-tenant decision (every user-owned table carries a `user_id` FK, no
cross-user sharing) — in particular, that decision means citation-graph data
has **no global dedup across users**: if two users each upload the same
paper, they get two separate `articles` rows, not a shared canonical record.

## Topics

- [zero-schema-conventions.md](./zero-schema-conventions.md) — Decided.
  Client-generated **UUIDv7** primary keys; `timestamptz` in Postgres
  exposed as `number()` epoch-ms in Zero's schema; **hard deletes** (no
  soft-delete/tombstones — doesn't fit this project's centralized,
  not-peer-to-peer architecture); schema declared once in Drizzle
  (`casing: "snake_case"`) with `zero/schema.ts` generated via the official
  `drizzle-zero` tool, per
  [../technologies/orm.md](../technologies/orm.md). Applies project-wide,
  not just to the lit-tracker.
- [article-core-schema.md](./article-core-schema.md) — Decided. `authors`
  as a `jsonb` array (not normalized — no cross-item author browsing need),
  with a generated+`pg_trgm`-indexed `authors_search` column for future
  author search (client-reactive search itself runs against Zero's SQLite
  replica/in-memory, unaffected by this Postgres-side index — see the doc
  for the distinction). This is why
  [../technologies/database.md](../technologies/database.md)'s Postgres
  floor was bumped to **v18+** (generated `stored` columns only replicate
  to Zero's client on 18+). Also: a persisted `extraction_status` enum
  (job rows are ephemeral, so the outcome must live on the article row),
  a stable Garage object-key convention (not a persisted URL), and a
  nullable `semantic_scholar_id` for per-user citation-graph matching
  (not cross-user dedup).
- [tags-and-reading-status.md](./tags-and-reading-status.md) — Decided.
  Reading status turned out **not** to need a tags-table representation at
  all — it's `articles.status` (see
  [article-core-schema.md](./article-core-schema.md)), a plain column,
  since [collection-view.md](../ui-ux/pages/lit-tracker/pages/collection-view.md)'s
  "unified" tag/status model is a UI-behavior requirement, not a schema
  one; the UI synthesizes 3 status buttons to render like tags. This
  avoided a materially more complex initial draft (per-user tag seeding
  with a Better Auth social-login hook pitfall, a protected-row trigger, a
  denormalized join column, a partial unique index) for no behavioral gain.
  `tags`/`article_tags` here are a plain many-to-many join, scoped to real
  user-defined tags only.
- [citation-graph-schema.md](./citation-graph-schema.md) — Decided. A
  single `citation_edges` table (not `references` — reserved SQL keyword),
  one row per bibliography entry with a nullable `cited_article_id`; a
  placeholder is just a row where that's null, and "graduation" is a plain
  `UPDATE`. Matching: Semantic Scholar `paperId` first, falling back to
  normalized title+first-author when neither side has one (mirrors S2's
  own linking practice, a deliberate user preference over the more
  conservative S2-ID-only alternative). `cited_article_id` uses `ON DELETE
  SET NULL` (not `CASCADE`, per
  [zero-schema-conventions.md](./zero-schema-conventions.md)'s new FK
  convention) — deleting the cited article reverts the edge to a
  placeholder rather than destroying the citing article's bibliography
  data. Per the multi-tenant decision above, all matching is per-user — no
  shared/global canonical-paper dedup even when Semantic Scholar IDs match
  across users.
- [annotations-schema.md](./annotations-schema.md) — Decided. Only
  universally-needed fields (`id`/`article_id`/`user_id`/`type`/
  `page_index`/`contents`/timestamps) are real columns; every type-specific
  field across EmbedPDF's 12 exposed annotation types (`color`/
  `segmentRects`/`inkList`/`vertices`/etc.) lives in one `payload: jsonb`
  column mirroring EmbedPDF's own object shape — EmbedPDF has no stated
  persistence/schema guidance of its own and nothing in this project's
  specs needs to query on any type-specific field individually. EmbedPDF's
  own `created`/`modified`/`author` fields aren't separately persisted —
  the row's own `created_at`/`updated_at` and `user_id` cover them. Stamp
  annotations are out of scope (not in
  [reader-annotation.md](../ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
  exposed type list), so no blob storage is needed for annotation payloads.
- [upload-jobs-schema.md](./upload-jobs-schema.md) — Decided. `status` is
  just `'processing' | 'failed'` (the UI never shows a finer-grained
  stage, and enrichment failures are non-fatal so never reach `'failed'`)
  with **no** terminal "completed" value — resolved rows are hard-deleted
  outright, matching
  [upload-status.md](../ui-ux/pages/lit-tracker/components/upload-status.md)'s
  "never a lingering history" requirement. The article row is created on
  extract-stage completion whether it succeeds or fails (best-effort
  `title`/`authors` fallbacks), so a failed job always has an article to
  open in `article-edit.md`. `id` pre-allocates the eventual article's ID
  (used immediately for the PDF's object key, matching
  [article-core-schema.md](./article-core-schema.md)'s convention exactly)
  and is the one table whose PK is Postgres-generated
  (`uuidv7()`, native as of Postgres 18) rather than client-generated,
  since these rows are only ever written server-side — see
  [zero-schema-conventions.md](./zero-schema-conventions.md) for that
  carved-out exception.
