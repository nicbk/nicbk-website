# Reader + Annotation UI

Status: Decided 2026-07-04.

The default main-content view within
[article-detail.md](../pages/article-detail.md) — swapped out for the
citation graph while the sidebar's Citations tab is active, and shown again
for any other sidebar tab (see
[citation-graph.md](./citation-graph.md)). Built on EmbedPDF's headless
architecture — see
[../../../../technologies/pdf-reader-annotations.md](../../../../technologies/pdf-reader-annotations.md)
for the underlying technology decision, including the resolved research on
how EmbedPDF's annotation data model is portable/syncable independent of the
PDF binary. No mockup on file — layout worked out directly with the user.

- **Toolbar**: a persistent top toolbar (not floating/contextual), holding:
  annotation tool buttons, page navigation (prev/next plus a page-number
  indicator), and zoom controls.
- **Annotation types exposed**: the full set EmbedPDF's annotation plugin
  supports — highlight; sticky note and free text; ink (freehand); and
  underline/strikeout/squiggly text markup plus shape annotations
  (square/circle/line/polyline/polygon), the latter useful for e.g. circling
  a figure or diagram.
- **Creation flow**: tool-select then apply — the user picks a tool (e.g.
  Highlight, with a color) from the toolbar, then selects text or
  clicks/drags on the page to apply it. The tool stays active for repeated
  use until the user switches tools or deselects, rather than requiring a
  fresh toolbar pick per annotation.
- **Persistence/sync**: live reactive sync, consistent with the rest of the
  app's reactive-data approach — annotations save automatically as they're
  created/edited/deleted, using EmbedPDF's `AnnotationScope` API
  (`createAnnotation`/`updateAnnotation`/`deleteAnnotation`, subscribed to
  via `onAnnotationEvent`) to feed our own database and reactive sync engine
  (see [sync-engine.md](../../../../technologies/sync-engine.md)), keyed by
  each annotation's `id`/`pageIndex`. The PDF file itself is never rewritten
  per edit — annotations are a normal syncable record type, separate from
  the PDF binary.
- **Annotations sidebar tab**: a 4th tab in
  [article-detail.md](../pages/article-detail.md)'s sidebar, alongside
  Tags/Notes/Citations — list-only, listing this article's annotations
  (e.g. a text/content snippet and page number per row). Selecting the tab
  does **not** swap the main content area (unlike Citations): the PDF reader
  stays as main content, since annotations conceptually live inside the
  reader itself, and clicking a row jumps/scrolls the reader to that
  annotation's page.
- **Notes vs. annotations**: kept distinct from
  [article-detail.md](../pages/article-detail.md)'s separate Notes tab
  (a free-text summary field for the article as a whole) — annotations are
  anchored to a specific point in the PDF, notes are not.
