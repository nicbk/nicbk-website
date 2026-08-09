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

## Revision — 2026-08-08: no visible page title, and one content column

Two clarifications made while building #7's task 3, after the first attempt
drew a large "collection" heading above the controls and the list.

- **The main panel has no visible page title.** The mockup's panel opens with
  the search row and the cards follow directly; the app name in the
  [header](../components/header.md) already says where you are. The `<h1>` still
  exists in the markup — it names the page for assistive technology and is the
  route-change focus-handoff target — but it is visually clipped.
- **The search row, the "+" button, the status indicator, and the cards share
  one content column.** The row reserves the search bar's slot even before
  search exists, so the controls sit against its trailing edge and the whole
  row lines up with the collection beneath it. Three separately-aligned
  bands — a centred title, right-hand controls, a left-aligned list — was the
  problem this fixes.

## Revision — 2026-08-09: a uniform grid, with elided text

Three clarifications made while building #8's first task, after seeing the first
card grid against a real collection.

- **Every card is the same size.** Columns are equal-width tracks and every row
  takes the height of the tallest, so a paper with a three-line title and one
  with a three-word title occupy identical cells. Cards sized to their own
  content read as an arrangement of boxes rather than as a grid, and the effect
  is worse the more varied a real collection is.
- **Text that does not fit is elided, and hovering reveals it.** The title
  clamps to two lines and the author and publication lines to one, each with an
  ellipsis and a native tooltip carrying the full string. This is what makes a
  uniform cell possible without losing anything: the complete text stays in the
  accessibility tree and one hover away. A native tooltip rather than the
  component library's is deliberate while the card is non-interactive — a
  tooltip trigger is focusable, and it would put three tab stops on every card
  in the collection.
- **The content column fills the panel.** It is inset by the shell's own
  padding and nothing else, so the gap above the grid, the gap beside the
  sidebar, and the gaps between cards are one measure. An earlier capped and
  centred column — correct when the panel held a single narrow list — left the
  grid floating with a wide gutter on each side.
