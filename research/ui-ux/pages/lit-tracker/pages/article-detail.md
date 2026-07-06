# Article Detail View

Status: Decided 2026-07-04.

Standalone page for a single article, reached by clicking a card on
[collection-view.md](./collection-view.md). No mockup on file — layout
worked out directly with the user.

- **Top**: article metadata summary (title, authors, year) below the lit-
  tracker header. A three-dot menu here opens
  [article-edit.md](../components/article-edit.md) for this article.
- **Main content**: the PDF reader, see
  [reader-annotation.md](../components/reader-annotation.md), by default — this is the
  primary task on this page, so it gets the main content area. Swaps to
  the citation graph, see [citation-graph.md](../components/citation-graph.md), while
  the sidebar's "Citations" tab is active (see below) — the reader shows
  again as soon as a different sidebar tab is active. No separate "back to
  reader" control is needed since this single piece of state (which
  sidebar tab is active) drives both.
- **Left sidebar**: same side as [collection-view.md](./collection-view.md)'s
  filter sidebar, but here scoped to this one article, organized as tabs:
  - **Tags** — this article's tags, edited via toggle (including its
    reading-status tag, since reading status is itself a tag — see
    [collection-view.md](./collection-view.md)'s tag model). No separate
    read-status control needed.
  - **Notes** — a free-text notes/summary field for the user's own notes
    on the article, kept separate from PDF annotations (which live in the
    reader itself, see [reader-annotation.md](../components/reader-annotation.md)).
  - **Citations** — activates the [citation-graph.md](../components/citation-graph.md)
    view in the main content area (see above), rather than showing
    anything in the sidebar itself.
  - **Annotations** — list of this article's PDF annotations (see
    [reader-annotation.md](../components/reader-annotation.md)); does
    **not** swap the main content area (unlike Citations) since annotations
    live inside the reader itself — clicking one jumps/scrolls the reader
    to that annotation's page.
- **Responsive/narrow screens**: the sidebar becomes a toggleable drawer
  (rather than stacking below the PDF reader — that would force scrolling
  past the entire reader to reach tags/notes/citations). Default state
  differs by width: **open by default on wide screens**, **collapsed by
  default on narrow screens** — consistent with
  [../../../design-system.md](../../../design-system.md)'s responsive/mobile
  layout conventions, made concrete for this page's specific main-content-
  heavy layout.

Uses the [lit-tracker header](../components/header.md).

**Semantic Scholar attribution**: this page (via its Citations tab / the
embedded [citation-graph.md](../components/citation-graph.md)) surfaces
bibliography data enriched from the Semantic Scholar API, so a visible
"Semantic Scholar" text credit must appear somewhere in this view, per
[../../../../licensing/third-party-attribution-requirements.md](../../../../licensing/third-party-attribution-requirements.md).
Exact placement/wording is left to implementation — the requirement is only
that the credit exists where S2-sourced data is shown.
