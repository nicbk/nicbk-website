# Annotations Schema

Researched: 2026-07-05. Decided: 2026-07-05.

The `annotations` table: one row per PDF annotation created via EmbedPDF's
`AnnotationScope` API, per
[reader-annotation.md](../ui-ux/pages/lit-tracker/components/reader-annotation.md)
and [pdf-reader-annotations.md](../technologies/pdf-reader-annotations.md)'s
resolved annotation data model. Follows the project-wide conventions in
[zero-schema-conventions.md](./zero-schema-conventions.md) (UUIDv7 PKs,
`timestamptz` timestamps, hard deletes, `ON DELETE CASCADE` on ownership
FKs, Drizzle-declared schema) and
[data-sharing-boundaries.md](../system-architecture/data-sharing-boundaries.md)'s
established pattern of a direct `user_id` column on every user-owned table
(not just reachable via a join), for the authorization filter every
`/query`/`/mutate` handler applies.

## Decision

```sql
annotations (
  id          uuid primary key,        -- client-generated UUIDv7
  user_id     uuid not null references "user"(id) on delete cascade,
  article_id  uuid not null references articles(id) on delete cascade,

  type        text not null,           -- 'highlight' | 'underline' | 'strikeout' | 'squiggly'
                                        -- | 'ink' | 'square' | 'circle' | 'line'
                                        -- | 'polyline' | 'polygon' | 'freeText' | 'text'
  page_index  integer not null,
  contents    text,

  payload     jsonb not null,          -- rect + type-specific fields (color, segmentRects,
                                        -- inkList, vertices, strokeWidth, fontSize, custom, flags, ...),
                                        -- mirrors EmbedPDF's own annotation object shape

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)

create index annotations_article_page_idx on annotations (article_id, page_index);
```

Note: **Stamp annotations are out of scope.**
[reader-annotation.md](../ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
exposed annotation-type list (highlight, sticky note/free text, ink,
underline/strikeout/squiggly, square/circle/line/polyline/polygon — 12
types) doesn't include Stamp, EmbedPDF's one annotation type with real
extra complexity (a raster/vector image in its own appearance stream,
needing actual blob storage). This confirms the schema never needs to
account for binary annotation payloads.

### Payload storage — normalize what's queried, `jsonb` for everything else

EmbedPDF itself has no stated persistence/backend-schema guidance:
`exportAnnotations`/`importAnnotations` round-trip EmbedPDF's own internal
object shape (not a JSON/XFDF/Adobe standard), and the only backend advice
found is "save to your own store once `onAnnotationEvent` fires a change."
Given the 13 annotation types each carry different fields (`inkList`/
`strokeWidth` for ink, `segmentRects`/`color` for markup types, `vertices`/
`lineEndings` for shapes, `fontSize`/`fontFamily` for free text, plus a
generic `custom` extension field) and nothing in this project's specs ever
needs to filter, sort, or join on any of those type-specific fields
individually, they're stored as-is in one `payload: jsonb` column mirroring
EmbedPDF's own object shape — this minimizes the translation layer between
a DB row and what `AnnotationScope.createAnnotation`/`updateAnnotation`
expect. A fully normalized per-type design (13 tables) was rejected: it
would fight EmbedPDF's own object-shaped create/update/import/export API
for no query benefit this project actually has.

Only universally-needed fields are real columns: `id`, `article_id`,
`user_id`, `type`, `page_index` (needed for
[reader-annotation.md](../ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
sidebar "jump to that annotation's page" behavior — this must not be
buried in `payload`), `contents` (the sidebar's "text/content snippet ...
per row" preview; EmbedPDF's docs don't specify whether this auto-populates
with underlying highlighted text for markup types or stays empty for
geometry-only types like shapes/ink — either way it's stored as-is, and any
empty-`contents` fallback display is a UI concern, not a schema one), and
the standard timestamps.

### Timestamps and author — no separate concept needed

EmbedPDF's annotation object has its own `created`/`modified` fields, but
these are optional plain JS `Date`s with no required format or independent
validation — this row's own `created_at`/`updated_at` (per
[zero-schema-conventions.md](./zero-schema-conventions.md)) serve both
purposes, populated onto the object handed back to `AnnotationScope` at
read time; no duplicate timestamp concept is stored.

Similarly, EmbedPDF's `author` field is not persisted at all. It's an
optional plain string with no documented effect on rendering/behavior, and
this app has no collaborative-annotation feature
([data-sharing-boundaries.md](../system-architecture/data-sharing-boundaries.md) —
every annotation has exactly one possible author, the owning `user_id`) —
storing a separate `author` value would just be a stale duplicate of data
already reachable via the row's own `user_id` FK. Populated from the
session user at read time instead.

### Foreign keys — both ownership, both `ON DELETE CASCADE`

Per [zero-schema-conventions.md](./zero-schema-conventions.md)'s FK
convention: an annotation has no meaning independent of the article it
annotates or the user who created it, so both `article_id` and `user_id`
are `ON DELETE CASCADE` — deleting the article or the account removes its
annotations, consistent with every other table in this category.

## Sources

- [embedpdf.com — Annotation Models](https://www.embedpdf.com/docs/engines/annotations/annotation-models),
  [embedpdf.com — Annotation Plugin (React headless)](https://www.embedpdf.com/docs/react/headless/plugins/plugin-annotation) —
  the 13 annotation types, per-type field shapes, `created`/`modified`/
  `author` field types, and confirmation of no stated persistence/schema
  guidance beyond "save on `onAnnotationEvent`."
