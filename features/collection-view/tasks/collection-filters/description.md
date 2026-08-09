# Task: Collection Filters

Third of four. The left rail — built empty in #7 and waiting since — becomes the
filter list the mockup shows.

## What this task does

- **Fills the sidebar rail's `filters` slot** with one toggle per tag the user
  has, above the account avatar, scrolling independently of it. The rail was
  built to size to its contents precisely so it widens on its own when this
  lands, with no change to the shell.
- **Renders the three reading statuses in the same list**, in the same visual
  treatment as a user tag, but as a **mutually-exclusive group**: selecting one
  deselects the other two. This is the unified filter model the decided spec
  asks for — one mechanism, not a tag sidebar plus a separate read-status
  control.
- **Composes tag selections with AND**: an article must carry *every* selected
  tag to remain visible. Same semantics as the blog list's tag filter, which this
  reuses the style and interaction of.
- **Puts filter state in the URL**, so a narrowed collection is shareable,
  bookmarkable, and survives refresh and back/forward — the pattern
  `useBlogFilters` already establishes.
- **Marks the rail up as a navigation region now that it has contents.** #7
  deliberately left it un-landmarked because naming an empty navigation region
  announces nothing to a screen reader; that stops being true here.
- **Moves the rail below the main content on narrow screens**, per the decided
  responsive convention — which names this exact rail as its example of a
  page-level structural shift driven by a media query.
- **Distinguishes "no articles match" from "no articles yet."** They are
  different facts and the reader can act on only one of them.

## Why after tags and before search

A tag filter cannot be reviewed, or even demoed, against a collection with no
tags in it — so it waits for task 2. And it comes before search because search
is the filter that has to *compose* with something: written first, its
interaction with rail filters would be designed against an absence; written
second, "tags AND status AND text" is one predicate over state that already
exists.

## Reuse, not a second implementation

The blog list already has `TagFilter`, a URL-mirroring filter hook, and a
filtering predicate, and `collection-view.md` names the blog's sidebar as the
precedent this one follows. What genuinely fits is extracted and shared; what is
specific to each stays put. Two filter implementations on one site is exactly
the drift the duplication rule exists to prevent — and the blog's version
carries a real fix worth not losing (dropping focus after a *pointer* activation
but not a keyboard one, so a tapped toggle does not keep a ring that reads as
"still selected").

## Not in this task

- **Search** — task 4, which composes with what this builds.
- **Infinite scroll** — also task 4.
- **Creating or deleting tags.** That is task 2's card menu; this task only
  reads the tag list.
- **Per-tag counts.** Nothing decided asks for them, and the schema doc
  specifically checked that no surface requires them.
