# Status: A Note Fits the Margin

**Feature state:** **In progress** (2026-09-16): its one task implemented and
in review.

Spec written against `main` at `aa3a741`, from measurements of the papers in the
collection and of the engine's own defaults, both taken before anything was
written. See [research.md](./research.md).

Depends on [`article-detail-and-reader`](../article-detail-and-reader/status.md)
(#9, Complete) for the reader and its annotation tools.

Feature parent issue: [**#216**](https://github.com/nicbk/nicbk-website/issues/216),
with one sub-issue. The roadmap entry is **#24** in [../index.md](../index.md).
Its parent issue is **checked** on completion and **closed by hand**.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`the-text-box-fits-a-margin`](./tasks/the-text-box-fits-a-margin/status.md) | Implemented ([#217](https://github.com/nicbk/nicbk-website/issues/217)) | — | — | In review |

## Definition of Done (feature)

All acceptance criteria met, the one task merged behind CI + review, and a note
written in a real margin in the browser at a desktop and a phone width.

## Notes carried into implementation

- **8pt in a 72pt box**, decided with the user against measured margins of 72pt
  and 108pt and body text of 8.6–9.8pt.
- **The red stays.**
- **Existing notes keep their size**; the change reaches new ones only.

## Log

- 2026-09-16 — **Implemented.** The override became a clone of the resolved
  tool: the plugin replaces `defaults` wholesale, so a partial one would have
  dropped the colour and the subtype. A height was added to the decision — the
  box does not grow with what is typed. Measured in the browser: 72 × 40pt at
  8.00pt, flush to the text block on an ACL paper and with 35pt to spare on a
  NeurIPS one.
- 2026-09-16 — **Spec'd.** Measured the engine's `freeText` defaults (14pt, a
  100 × 20pt click box) and the margins of two papers in the collection through
  GROBID's paragraph coordinates. Four candidate sizes were put to the user with
  their characters-per-line; 8pt was chosen.
