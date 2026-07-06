# Tags and Reading Status

Researched: 2026-07-05. Decided: 2026-07-05.

User-defined tags for articles, and how reading status
(`pending`/`reading`/`read`) relates to them. Follows the project-wide
conventions in [zero-schema-conventions.md](./zero-schema-conventions.md)
(UUIDv7 PKs, `timestamptz` timestamps, hard deletes, Drizzle-declared
schema) and references [article-core-schema.md](./article-core-schema.md)'s
`articles` table.

## Decision

### Reading status is not modeled here — it's a plain column on `articles`

[collection-view.md](../ui-ux/pages/lit-tracker/pages/collection-view.md)
specs reading status as appearing in the same tag list/filter UI as
user-defined tags, mutually exclusive, and non-renamable/non-deletable —
but that's a UI/interaction requirement, not a schema requirement. Checked
directly: nothing in `collection-view.md`, `article-detail.md`, or
[blog-list.md](../ui-ux/pages/site-wide/pages/blog-list.md) (the tag-sidebar
precedent collection-view.md cites) requires per-tag counts or any specific
backing table — `blog-list.md` confirms its own tag sidebar is
toggle-buttons-only, no counts shown, for either tags or a status concept.

An earlier draft of this topic modeled reading status as 3 rows seeded into
this table (`kind: 'pending'|'reading'|'read'|null`), with a denormalized
`kind` copy on the join table, a partial unique index for mutual
exclusivity, and a `BEFORE UPDATE OR DELETE` trigger to block renaming/
deleting the built-ins. That was rejected once the actual tradeoff was
checked against the alternative — see
[article-core-schema.md](./article-core-schema.md#reading-status--a-plain-column-not-a-tags-table-concept)'s
`status` column:

- **Schema complexity**: a column needs none of the seeding logic (which
  also would have had to dodge a documented Better Auth bug —
  `better-auth/better-auth#7260` — where `user.create.after` can hit an
  FK-constraint violation specifically during **social login**, this
  project's chosen auth flow per [auth.md](../technologies/auth.md)), no
  protected-row trigger, and no denormalized join-table column. Mutual
  exclusivity is a free property of a single-valued column — no constraint
  needed to enforce it.
- **Filtering**: Zero's ZQL combines a plain column filter (`status`) and
  a relationship-based filter (real tags, via `exists`) in one reactive
  query with no friction — confirmed against Zero's query docs. A scalar
  `where('status', ...)` is if anything cheaper than the join every real
  tag already needs, not harder.
- **The tags-table approach's only real hypothetical benefit** — a user
  eventually renaming what "reading" displays as without a code change —
  doesn't hold, since `collection-view.md` already rules out renaming
  built-ins entirely.

The only remaining cost of the column approach is UI-layer work
(synthesizing 3 status buttons that render identically to real tag
buttons in the shared sidebar/filter component, and folding `status` into
the existing search-bar match) — that work is unavoidable either way,
since built-ins need special non-deletable rendering regardless of which
table backs them.

### Tags and article-tags — real user-defined tags only

```sql
tags (
  id         uuid primary key,        -- client-generated UUIDv7
  user_id    uuid not null references "user"(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
)

article_tags (
  id         uuid primary key,        -- client-generated UUIDv7
  article_id uuid not null references articles(id) on delete cascade,
  tag_id     uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (article_id, tag_id)
)
```

Standard many-to-many join shape, per this project's established
conventions (including [zero-schema-conventions.md](./zero-schema-conventions.md)'s
`ON DELETE CASCADE` on all three FKs here — every one is an ownership
relationship, not a soft reference) — no reading-status-specific columns,
seeding, or triggers needed, since that concept now lives entirely on
`articles.status`. Tags
are scoped per-user (there is no cross-user or shared-tag feature anywhere
in the specs, consistent with
[data-sharing-boundaries.md](../system-architecture/data-sharing-boundaries.md)'s
already-decided per-user scoping), user-defined, and freely
created/renamed/deleted through the same mutate-handler path as everything
else.

## Sources

- [zero.rocicorp.dev/docs/zql](https://zero.rocicorp.dev/docs/zql),
  [zero.rocicorp.dev/docs/reading-data](https://zero.rocicorp.dev/docs/reading-data) —
  confirms `where()`/`whereExists()`/`and`/`or`/`cmp`/`exists` combine a
  plain column filter and a relationship-based filter in one reactive ZQL
  query.
- [github.com/better-auth/better-auth issue #7260](https://github.com/better-auth/better-auth/issues/7260) —
  documented `user.create.after` hook FK-violation risk specifically during
  social login, the reason a signup-hook-based tag-seeding approach (from
  the rejected draft) would have been fragile.
