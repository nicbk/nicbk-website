# Manual Article Edit Interface

Status: Decided 2026-07-02.

Lets the user manually edit an article's metadata and references, or
delete the article. Two entry points:

- From [collection-view.md](../pages/collection-view.md): a three-dot menu icon
  in the top-right of each article card opens this interface for that
  article.
- From [upload-status.md](./upload-status.md)'s job list popup: articles
  flagged with a warning icon (metadata extraction failed/incomplete) open
  this interface pre-focused on the missing/problem fields.

- **Presentation**: a centered modal, consistent with
  [upload-flow.md](./upload-flow.md) and
  [../../site-wide/components/user-settings.md](../../site-wide/components/user-settings.md).
- **Editable fields**: title, authors, publication year, and any other
  relevant extracted metadata (e.g. venue/journal, DOI) — exact field list
  to be pinned down at data-schema-design time, not here. Title and
  authors are required; publication year, venue/journal, and DOI can be
  left blank/optional.
- **References are also editable** here — adding, removing, or correcting
  an article's references. Updating references updates the article's
  position in the citation graph accordingly, see
  [citation-graph.md](./citation-graph.md) (still to be spec'd — this
  interface is one of its inputs).
- **Editing/non-editing reactive-UI state**: this interface is a form bound
  to reactive data, so
  [../../../design-system.md](../../../design-system.md)'s editing/non-editing
  pattern applies directly — opening the modal enters editing state
  (incoming live updates to this article are not applied until the modal
  closes), and a successful save returns to non-editing state.
- **Delete confirmation**: deleting an article requires a confirmation
  step using the same exact-text-match pattern as
  [../../site-wide/components/user-settings.md](../../site-wide/components/user-settings.md)'s
  delete-account confirmation (not a native `confirm()` dialog) — deletion
  is destructive enough to warrant more friction than a simple confirm
  click, even though an article is lower-stakes than an account.

Uses the [lit-tracker header](./header.md) as underlying page context (the
modal itself has no separate header).
