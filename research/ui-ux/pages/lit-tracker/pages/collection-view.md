# Collection View

Status: Decided 2026-07-02.

The lit tracker's home surface: the user's article collection as a
card grid, with search and tag-based filtering. Rough look/feel from
[../../../sample-mockups/literature-tracker-sample.png](../../../sample-mockups/literature-tracker-sample.png)
(rounded cards, sidebar filter tags, search bar) — not literal spec, see
[../../index.md](../../index.md)'s mockups note.

- **Card content**: title, authors (fewer than 3: show all; 3 or more: show
  the first author followed by "et al."), publication year, tags (including
  the reading-status tag — see below). No date-added field. Clicking a card
  navigates to [article-detail.md](./article-detail.md). A three-dot menu
  icon in the card's top-right corner opens
  [article-edit.md](../components/article-edit.md) for that article.
- **Layout**: grid, collapsing to a single-column list on narrow
  screens/sidebar contexts — consistent with
  [../../../design-system.md](../../../design-system.md)'s responsive/mobile
  layout conventions (container queries for the card component itself, so
  it adapts regardless of which container it's placed in).
- **Tags and reading status — unified model**: tags are user-defined and
  freely created/deleted, and are multi-select for filtering (sidebar list
  of toggleable tag buttons, same interaction as the blog list's tag
  sidebar). Reading status (`pending` / `reading` / `read`) is modeled as
  three special built-in tags rather than a separate concept: they appear
  in the same tag list/filter UI as user tags, but (a) cannot be renamed or
  deleted, and (b) are mutually exclusive on a given article — assigning
  one automatically unsets the others, i.e. they behave as a single-select
  group within the otherwise multi-select tag list. This keeps the
  filtering UI to one mechanism instead of a tag sidebar plus a separate
  read-status control.
- **Search bar**: matches title, authors, and tags (including reading-status
  tags). Live-as-you-type, filtering the already-synced local Zero cache
  (see [../../../../technologies/sync-engine.md](../../../../technologies/sync-engine.md))
  rather than a submit-triggered/server round-trip search.
- **Pagination**: infinite scroll, consistent with
  [../../site-wide/pages/blog-list.md](../../site-wide/pages/blog-list.md).
- **Add article**: a "+" button next to the search bar opens
  [upload-flow.md](../components/upload-flow.md).
- **Empty collection**: plain inline text per
  [../../../design-system.md](../../../design-system.md)'s "Reactive UI feedback
  patterns" default (no illustration).

Uses the [lit-tracker header](../components/header.md).
