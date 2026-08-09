# Plan: Collection View

## Approach

Build **the thing being organized before the ways of organizing it**: draw the
card first, give it data worth filtering by, then build the two filters that
narrow it — the rail, then the search bar.

Each task is a vertical slice that leaves the page better than it found it, and
each is gated by its own PR + CI + human review before the next begins.

The ordering matters for one reason above the others: **task 2 carries the
site's first client-side write path**, and a write path is the kind of thing
that deserves a review of its own rather than a review shared with a grid
layout and a search box. Task 1 is deliberately read-only so that task 2's diff
is almost entirely about mutators, authorization, and the `/mutate` seam.

## Task breakdown and sequence

Tasks are sequential — one open at a time, each gated by its own PR + CI +
human review.

1. **[`article-cards`](./tasks/article-cards/description.md)** — Replace the
   plain list with the decided card grid: title, authors under the "3 or more →
   first author + et al." rule, publication year, and venue where the pipeline
   recovered one. The card adapts by **container query** so it is correct in the
   grid and in any narrower container later; the grid collapses to one column on
   narrow screens. No menu, no tags, no navigation. Exit state: the collection
   looks like the mockup's panel, with everything #7 extracted finally visible.

2. **[`tags-and-reading-status`](./tasks/tags-and-reading-status/description.md)**
   — The `tags` and `article_tags` migration (plus the `zero_data` publication,
   `drizzle-zero.config.ts`, and the generated Zero schema, all in one change),
   the **first Zero mutators** — create/delete a tag, attach/detach a tag, set
   reading status — and the card's three-dot menu that invokes them. Tags render
   on the card, reading status among them. Exit state: a user tags a paper in
   one window and the tag appears in another, with `/mutate` proven to reject a
   write aimed at another user's row.

3. **[`collection-filters`](./tasks/collection-filters/description.md)** — The
   left rail's filter list: every tag the user has as a toggle, AND-composed,
   plus the three reading statuses as a mutually-exclusive group rendered
   identically. Filter state lives in the URL, as the blog's does. On narrow
   screens the rail moves below the content per the decided responsive
   convention. Exit state: the grid narrows to the selected filters, and the
   narrowed view is a shareable URL.

4. **[`collection-search`](./tasks/collection-search/description.md)** — The
   search input in the toolbar slot #7 reserved, matching title, authors, tags,
   and reading status, filtering as the user types and composing with the rail's
   filters; the "+" button and status indicator sit immediately against the
   input's trailing edge. Plus **infinite scroll** — incremental reveal over the
   already-synced rows, not pagination. Exit state: the full decided collection
   view, and the last of #7's deliberately-empty placeholders is filled.

## Sequencing rationale

- **The card first**, because it is the only task whose output is purely
  visual and read-only, and because every later task acts *on* cards: a filter
  hides them, search hides them, the menu hangs off one. Building it first means
  the later tasks are verified against the real presentation rather than against
  a list that is about to be replaced.
- **Writes second, alone with the schema they write to.** `/mutate` is the write
  half of the authorization boundary `/query` owns, and #7 shipped it real but
  unexercised. Its first consumer is worth isolating for the same reason task 1
  of #7 isolated `/query`: getting user-scoping wrong here is a data-integrity
  bug, not a cosmetic one. Bundling it with a grid layout would bury it.
- **Tags before the filter that uses them**, which is the ordering forced by
  the feature's own dependency: a tag filter cannot be reviewed — or even
  meaningfully demoed — against a collection with no tags in it.
- **Search last**, because it is the only filter that composes with something
  else. Written before the rail, its interaction with rail filters would be
  designed against an absence; written after, "search AND tags AND status" is
  one predicate over state that already exists.

## What this feature deliberately does not introduce

- **Navigation to an article.** The card's click target is the detail page,
  which is #9. Cards are not links here, and the three-dot menu is the only
  interactive thing on them.
- **Metadata editing, reference editing, and article deletion** — #11, which
  extends this feature's card menu rather than replacing it. That is also why a
  failed upload's warning row still cannot be cleared.
- **Citation-graph traversal UI** (#10). The edges #7 wrote stay invisible.
- **Server-side search.** `articles.authors_search` and its `pg_trgm` index
  exist from #7 and stay unused: search here runs client-side against Zero's
  synced rows, exactly as
  [article-core-schema.md](../../research/data-modeling/article-core-schema.md)
  says it will.
- **Sort controls.** The decided spec names no sort UI, and the collection's
  order is `createdAt` descending from #7's query. Nothing here changes it.
