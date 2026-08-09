# Feature: Collection View

The Lit Tracker's **browsing slice**. #7 made the tracker able to *take* an
article; this makes it able to *hold* one — the difference between a pipeline
with a receipt and a collection you can organize, narrow, and find things in.

It is also the site's **first client-side write**. Everything user-visible so
far has been either static content or a row written by a server-side job
handler; here a user changes their own data from the browser, optimistically,
and every other open client sees it. `/mutate` has existed since #7 with an
empty registry and a comment pointing at this feature; this is the feature that
plugs into it.

The user-visible slice: a signed-in user opens `/lit-tracker` and sees their
collection as a grid of cards — title, authors, year, venue, and tags. They mark
a paper `reading`, tag it `transformers`, then narrow the grid to
`reading` + `transformers` from the left rail, or just type "attention" into the
search bar and watch the grid shrink as they type. Every one of those is live
across clients, with no refresh and no save button.

Concretely, this feature produces:

- The **article card and its grid** — the presentation
  [collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
  decided and #7 deliberately deferred, replacing the plain title/author list
  with cards that adapt by **container query** rather than by page width.
- The **`tags` and `article_tags` tables** — the last two user-owned tables the
  Lit Tracker's core needs, migrated exactly as
  [tags-and-reading-status.md](../../research/data-modeling/tags-and-reading-status.md)
  specifies, added to the `zero_data` publication and the generated Zero schema
  in the same migration.
- The **first real Zero mutators**: create a tag, delete a tag, attach and
  detach a tag, and set an article's reading status — each authorized in
  `/mutate` against the same server-derived user context `/query` uses, because
  Zero has no permissions layer behind it either.
- The **filter rail**: the tag list the left rail was built empty for, with the
  three reading statuses rendered as toggles beside the user's own tags.
- **Live search and infinite scroll** over the synced collection — no server
  round-trip, because the rows are already on the client.

## Scope boundary

This feature is **browse and organize, not read and not edit**.

- **Cards do not navigate.** A card's target is the article detail page, which
  is #9 and does not exist. A card that looks clickable and isn't is worse than
  one that plainly isn't, so cards carry no link and no pointer affordance until
  #9 adds one.
- **Metadata editing, reference editing, and deleting an article are #11.** The
  card's three-dot menu is built here because tags and reading status need
  somewhere to live (see below), and #11 adds its "edit…" and "delete…" items to
  the **same** menu rather than building a second one.
- **The citation graph is not rendered.** #7 populated `citation_edges`; showing
  them is #10.

## Why tag assignment is here and not in #11

[collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
puts tag editing behind the card's three-dot menu, which opens
[article-edit.md](../../research/ui-ux/pages/lit-tracker/components/article-edit.md)
— and that is **#11**, which is not scheduled before this feature. Taken
literally, this feature would ship a tag filter over a tag set the user has no
way to create.

Resolved with the user before the spec was written, rather than improvised
during it: **#8 owns assigning tags and setting reading status; #11 keeps
metadata, references, and delete.** Two reasons this is the right cut and not
merely the convenient one:

- Reading status is a collection-view concept in the decided model — the spec
  renders it *as a tag*, in the same filter list, and
  [the tracker's own design brief](../../high-level-guidance/design/lit-tracker/DESIGN.md)
  lists "user can set read status" as a top-level feature. A collection where a
  paper cannot be marked read from the collection is the wrong shape.
- The alternative is a filter with nothing to filter by, shipped and reviewed as
  a working feature. That is the failure mode this project's
  vertical-slice rule exists to prevent.
