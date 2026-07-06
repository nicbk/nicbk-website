# Lit-tracker Components

Status: all decided (2026-07-04).

Modals and embedded main-content/sidebar views used by
[../pages/index.md](../pages/index.md)'s standalone pages — not routes of
their own. See [../index.md](../index.md) for the pages-vs-components
split rationale.

- [header.md](./header.md) — Decided. Fixed app-shell header (not a
  scrolling-page sticky header): app name/home link, breadcrumb that grows
  with citation-graph traversal, user avatar opening the shared
  user-settings modal.
- [upload-flow.md](./upload-flow.md) — Decided. Modal: PDF upload, opened
  from collection-view's "+" button.
- [upload-status.md](./upload-status.md) — Decided. Status icon/button +
  job-list popup tracking background upload/extraction jobs.
- [article-edit.md](./article-edit.md) — Decided. Modal: manual metadata/
  reference editing and article deletion.
- [citation-graph.md](./citation-graph.md) — Decided. Main-content-area
  view within article-detail.md (not its own route), for traversing an
  article's references/citations.
- [reader-annotation.md](./reader-annotation.md) — Decided. Main-content-
  area view within article-detail.md: the PDF reader (EmbedPDF) with a
  persistent toolbar, full annotation-type support, live reactive sync, and
  a list-only Annotations sidebar tab.
