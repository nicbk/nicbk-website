# Task: Tags and Reading Status

Second of four, and the largest. The site's **first client-side write** — and
therefore the first exercise of `/mutate`, the write half of the authorization
boundary #7 built and left with an empty registry.

## What this task does

- **Adds the `tags` and `article_tags` tables**, exactly as
  [tags-and-reading-status.md](../../../../research/data-modeling/tags-and-reading-status.md)
  specifies them: `tags(id, user_id, name, created_at)`,
  `article_tags(id, article_id, tag_id, created_at)` with
  `unique (article_id, tag_id)`, UUIDv7 primary keys, `timestamptz`, and
  `ON DELETE CASCADE` on all three foreign keys — every one is an ownership
  relationship. **No `kind` column, no seeded rows, no trigger**: reading status
  is `articles.status` and is not modeled here.
- **Extends the `zero_data` publication and `drizzle-zero.config.ts` in the same
  migration**, then regenerates `src/zero/schema.gen.ts`. That is the standing
  rule for every synced table, and only the last of the three steps is caught by
  CI's drift check.
- **Registers the first Zero mutators** in `src/zero/mutators.ts`:
  - create a tag,
  - delete a tag,
  - attach a tag to an article,
  - detach a tag from an article,
  - set an article's reading status.

  Each validates its arguments and takes its owner from the **server-derived
  context**, never from the arguments. `mutate-endpoint.ts` already carries the
  exact line this replaces.
- **Adds the queries that read them back**, in `src/zero/queries.ts`, scoped by
  `ctx.id` and returning `.limit(0)` with no session — the same shape as every
  query already there. A card's tags arrive by sync like everything else on this
  page; nothing about them is fetched.
- **Builds the card's three-dot menu** in the card's top-right corner, holding
  the tag and status controls. Applying a tag that does not exist yet **creates
  it** — there is no separate "manage tags" screen to visit first.
- **Renders tags on the card**, with the article's reading status among them,
  drawn identically to a user tag.

## Why the write path is isolated here

`/query` got a task of its own in #7 because getting user-scoping wrong there
leaks data. `/mutate` deserves the same for the mirror-image reason: a mutator
that trusts its arguments lets one account write into another's collection, and
the client's optimistic copy will apply that write locally without complaint
before the server ever sees it. The server is the only thing that can say no.

So this task's diff is deliberately about schema, mutators, and authorization —
task 1 already took the grid layout out of it, and tasks 3 and 4 keep filtering
out.

## The three built-in statuses are not rows

`pending`, `reading`, and `read` are values of `articles.status`, synthesized in
the UI to look and behave like tags. They are not created, cannot be deleted,
and are **mutually exclusive** — which is a free property of a single-valued
column rather than a constraint anyone has to enforce. The rejected alternative
(three seeded rows, a denormalized `kind`, a partial unique index, and a trigger
protecting the built-ins) and the reasons it was rejected are in the schema doc;
this task implements the decision, not the alternative.

## Where this leaves #11

The menu built here is the one
[article-edit.md](../../../../research/ui-ux/pages/lit-tracker/components/article-edit.md)
specifies as its entry point. #11 adds "edit…" and "delete…" **to this menu**
rather than building a second one; nothing here is written to be thrown away.

## Not in this task

- **Filtering by the tags this creates** — task 3. Tags are visible and editable
  here, not yet a way to narrow the collection.
- **Search** — task 4.
- **Editing metadata, editing references, deleting an article** — #11.
- **Tag renaming.** The decided model has create and delete; a rename affordance
  is not specified anywhere, and inventing one would be a UI decision with no
  decision behind it.
