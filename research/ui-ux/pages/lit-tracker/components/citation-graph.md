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

## Revision (2026-09-14), decided with the user at spec time

Spec'd as [`citation-graph-traversal`](../../../../../features/citation-graph-traversal/description.md)
(#10). Three bullets above change; the rest stand.

- **The swap hides the reader rather than replacing it.** The main area still
  shows this view while Citations is active, but the reader stays mounted behind
  it. Measured on `nicbk.com`, a remount is ~0.4s of blank panel; hidden, the
  return is instant and the place is kept.
- **"Not in collection" items link out.** 95%+ of them carry a Semantic Scholar
  id, so they open the paper's Semantic Scholar page in a new tab, marked
  external. Without an id they stay plain text. They show the reference as the
  paper printed it when that text exists.
- **The breadcrumb becomes a short path in the header's title slot**, not a
  growing trail. Only the chain from the starting paper to the open one is kept:
  returning to a paper on it cuts it back, each step is labelled cites / cited
  by, the middle folds into "…" past three, and it is kept in the URL. A plain
  trail was rejected as unwieldy after a few hops.

## Revision (2026-09-15), decided with the user at implementation

After using the first build:

- **Two tabs, the two directions**: *cites* and *cited by*. The three traversal
  modes above survive as structure rather than tabs: *cites* groups the papers
  in your collection first and the rest under *elsewhere*. Three tabs — in your
  collection, cited by, not in your collection — read as three places.
- **The "N of M references read" shortfall is dropped.** Semantic Scholar's
  reference count disagreed with the printed bibliography on three of four local
  papers, so the message reported losses that had not happened.
- **The Semantic Scholar credit moves to the tracker header** (an information
  button opening a credits popup; see [header.md](./header.md)). Its licence
  requires attribution on the website, not on each page using the data, and in
  the view it cost a row of the panel.
- **The view's tab rule lines up with the sidebar's**, which it sits beside.
- **Switching to and from the view is a history entry**, so Back from the lists
  returns to the paper.
