# Citation Graph Traversal UI

Status: Decided 2026-07-04.

A component, not a standalone page: it's the alternate main-content view
within [article-detail.md](../pages/article-detail.md), swapped in when that
page's sidebar has the "Citations" tab active (in place of the PDF reader
from [reader-annotation.md](./reader-annotation.md)). See
[../../../../technologies/citation-graph.md](../../../../technologies/citation-graph.md)
for the underlying decision to use a simple list/breadcrumb UI rather than
a graph-visualization canvas.

- **Main-content swap mechanism**: driven entirely by which sidebar tab is
  active on the article-detail page — Tags or Notes active shows the PDF
  reader; Citations active shows this citation-graph view. One piece of
  state, no separate "back to reader" control needed.
- **Traversal modes as tabs**: within this view, tabs for the three
  traversal modes identified in
  [../../../../technologies/citation-graph.md](../../../../technologies/citation-graph.md):
  referenced articles in the collection, articles citing this one, and
  referenced articles not in the collection.
- **List item content**: title and authors. Items in the "not in
  collection" tab additionally show a visual indicator that they're not in
  the collection, and are **not clickable** — only bare metadata parsed
  from the citing article's own reference list is available for them (no
  way to add them here; the user would need to separately upload the
  referenced PDF via [upload-flow.md](./upload-flow.md)).
- **Navigating to an in-collection item**: clicking one navigates the
  whole page to that article's own detail view — main content resets to
  the PDF reader, sidebar resets to its default tab.
- **Breadcrumb**: navigating between articles via citation-graph clicks
  grows the lit-tracker header's breadcrumb path (e.g.
  `↳/nicbk_home/Article A/Article B`), and each segment is clickable to
  jump back to that point in the path. Navigating to a fresh article by
  any route other than the citation graph (e.g. from
  [collection-view.md](../pages/collection-view.md)) resets the breadcrumb. This
  is the dependency [header.md](./header.md) was waiting on before its
  own spec could be finalized.
- **Semantic Scholar attribution**: because the citation edges shown here
  are enriched from the Semantic Scholar API, this view (or the enclosing
  [article-detail.md](../pages/article-detail.md) page) must carry a visible
  "Semantic Scholar" text credit, per the licensing obligation in
  [../../../../licensing/third-party-attribution-requirements.md](../../../../licensing/third-party-attribution-requirements.md).
  Exact placement/wording is an implementation detail; the requirement is
  only that the credit exists somewhere this S2-sourced data is displayed.
