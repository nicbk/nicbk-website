# Status: A Citation Opens the Paper

**Feature state:** **Not started** (2026-09-16): 3 tasks.

Spec written against `main` at `b570453`, from measurements of GROBID's
coordinates on two papers and a reading of what #22's preview already resolves.
See [research.md](./research.md).

Depends on [`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7), [`citation-graph-traversal`](../citation-graph-traversal/status.md) (#10)
and [`a-link-is-a-link`](../a-link-is-a-link/status.md) (#22), all Complete.

Feature parent issue: [**#220**](https://github.com/nicbk/nicbk-website/issues/220),
with one sub-issue per task. The roadmap entry is **#25** in
[../index.md](../index.md). Its parent issue is **checked** on completion and
**closed by hand**.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`the-entry-is-located`](./tasks/the-entry-is-located/status.md) | Not started ([#221](https://github.com/nicbk/nicbk-website/issues/221)) | — | — | — |
| [`the-preview-knows-the-paper`](./tasks/the-preview-knows-the-paper/status.md) | Not started ([#222](https://github.com/nicbk/nicbk-website/issues/222)) | — | — | — |
| [`open-in-tracker`](./tasks/open-in-tracker/status.md) | Not started ([#223](https://github.com/nicbk/nicbk-website/issues/223)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria met, all three tasks merged behind CI + review, and the
flow checked in Safari on `nicbk.com` after deploy.

## Notes carried into implementation

- **Matched by rectangle, not by number or text** — the printed numbering does
  not always follow the entry order, and extracted text is unreliable on exactly
  the papers that need this most (#22's own finding).
- **One edge or none.**
- **The hop is recorded**, through #10's path rules (decided with the user).
- **No clickable marker layer**, though GROBID locates every marker: decided
  with the user to leave that until this has been used.

## Log

- 2026-09-16 — **Spec'd.** Measured GROBID's `ref` and `biblStruct` coordinates
  on RoBERTa and Attention, and confirmed one request path feeds both the first
  extraction and #10's re-read. Two questions decided with the user: the preview
  gains the action rather than every marker becoming clickable, and the hop is
  recorded like any other.
