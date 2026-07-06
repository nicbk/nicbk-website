# Article Upload Flow

Status: Decided 2026-07-02.

Triggered by the "+" button on [collection-view.md](../pages/collection-view.md).
Covers only the initial submission step — ongoing progress and failure
handling are a separate interface, see "Handoff" below.

- **Input**: PDF upload only (no URL/DOI lookup, no manual entry at this
  step). The user can select and submit multiple PDFs in a single upload.
- **Metadata**: fully auto-extracted from each PDF; the user does not
  review or edit metadata before saving — keeps this step to a single
  action (pick files, submit), consistent with the design philosophy's
  low-friction guidance. Any extraction problems are handled later, via
  [article-edit.md](./article-edit.md), not blocking submission here.
- **Reading status**: every newly uploaded article is auto-assigned the
  `pending` tag (see [collection-view.md](../pages/collection-view.md)'s
  reading-status-as-tags model).
- **Presentation**: a simple modal containing only a PDF upload interface
  (file picker, multi-select).
- **Handoff**: once the user successfully submits one or more PDFs, the
  modal closes immediately — extraction happens in the background, tracked
  by the upload-status indicator/job list, see
  [upload-status.md](./upload-status.md).

Uses the [lit-tracker header](./header.md) as underlying page context (the
modal itself has no separate header).
