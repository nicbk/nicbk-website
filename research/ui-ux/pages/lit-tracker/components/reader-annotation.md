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

## Revision (2026-08-13), decided with the user at implementation

**The toolbar overlays the document instead of sitting above it, and its groups
float rather than forming one solid bar.** The bullet above rules out a
"floating/contextual" toolbar, and the half of that which matters is kept: the
toolbar is *persistent* — always present, identical whatever the reader is doing,
never summoned by a selection or anchored to what is under the cursor. What
changed is where its pixels come from.

- **As a row of its own it cost its full height everywhere.** On the one page
  whose purpose is showing a document, a permanent strip above the paper is the
  most expensive furniture in the tracker. Absolutely positioned over the top of
  the document, it costs that height only at the very top of the scroll — the
  first page is offset to clear it, and from there on the document runs the full
  height of the panel and passes underneath.
- **The bar is transparent; the control groups are not.** Pages on the left, zoom
  on the right, the reserved annotation-tool slot between them, each an opaque
  rounded surface with the paper visible in the gaps. A solid band read as a
  second header and walled the document off from the page it sits on. This is the
  same arrangement [collection-view.md](../pages/collection-view.md)'s toolbar
  arrived at independently, for the same reason: transparent is the row, never
  the controls.
- **The page-level controls joined it** — the sidebar's narrow-screen trigger and
  the article's three-dot menu, as a third floating group at its end. They had
  been in the metadata header the same decision removed (see
  [header.md](./header.md)'s 2026-08-13 revision), and a row kept alive for two
  buttons costs more document than the separation was worth. A menu opened from
  that group dims and disables what is behind it, so the bar is not left looking
  live underneath its own popup.

The general lesson, recorded because it will recur: **"not floating" was written
about a toolbar's *behaviour* — where it appears and when — and was then read as
a statement about its *background*.** When a decided constraint turns out to
carry two readings, the one to keep is the one the reasoning was about.
