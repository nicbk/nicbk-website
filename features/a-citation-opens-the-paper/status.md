# Status: A Citation Opens the Paper

**Feature state:** **In progress** (2026-09-16): 3 tasks, 2 complete, the third
in review.

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
| [`the-entry-is-located`](./tasks/the-entry-is-located/status.md) | **Complete** ([#221](https://github.com/nicbk/nicbk-website/issues/221)) | [#225](https://github.com/nicbk/nicbk-website/pull/225) | green | merged |
| [`the-preview-knows-the-paper`](./tasks/the-preview-knows-the-paper/status.md) | **Complete** ([#222](https://github.com/nicbk/nicbk-website/issues/222)) | [#226](https://github.com/nicbk/nicbk-website/pull/226) | green | merged |
| [`open-in-tracker`](./tasks/open-in-tracker/status.md) | Implemented, in review ([#223](https://github.com/nicbk/nicbk-website/issues/223)) | — | — | — |

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

- 2026-09-16 — **Task 3 implemented**, and criteria 1, 2 and 3 checked in Chrome
  on BERT: *Vaswani et al. (2017)* opens *Attention Is All You Need* with the
  path reading `›cites`, while a citation to a paper not in the collection and a
  figure link offer nothing. Where the action sits was decided against measured
  header widths (`tasks/open-in-tracker/status.md`).
- 2026-09-16 — **Task 2 merged** (#226).
- 2026-09-16 — **Task 2 implemented.** The matching rule, measured over the 343
  located references now in the local collection before the threshold was
  chosen: the entry a region is showing is covered 1.000, the entry above it at
  worst 0.406, so half is the line. No region in the collection covered two
  entries, so the refusal is a guard rather than a common answer.
- 2026-09-16 — **Task 1 merged** (#225). Older papers gain their rectangles on
  the next deploy, through #10's re-read.
- 2026-09-16 — **Spec'd.** Measured GROBID's `ref` and `biblStruct` coordinates
  on RoBERTa and Attention, and confirmed one request path feeds both the first
  extraction and #10's re-read. Two questions decided with the user: the preview
  gains the action rather than every marker becoming clickable, and the hop is
  recorded like any other.
