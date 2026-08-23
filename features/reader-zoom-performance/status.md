# Status: Reader Zoom Performance

**Feature state:** **Complete** (2026-08-23) — its one task merged as `0907859`
([PR #123](https://github.com/nicbk/nicbk-website/pull/123)) behind green CI and
human review. Parent issue **#120 closed by hand**, as this file's own note
below requires.

Depends on [`article-detail-and-reader`](../article-detail-and-reader/status.md)
(#9, Complete) for the reader and its plugin registration, and sits beside
[`reader-touch-and-gestures`](../reader-touch-and-gestures/status.md) (#12, in
progress) without touching it: same reader, different subsystem — that one
changes what a hand does, this one changes what is drawn.

Feature parent issue: **#120**, with one sub-issue, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#14** in [../index.md](../index.md). When the feature
completes, its parent issue **must be closed by hand** — GitHub does not close a
parent when its sub-issues close.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`tiled-rendering`](./tasks/tiled-rendering/status.md) ([#121](https://github.com/nicbk/nicbk-website/issues/121)) | **Merged** | [#123](https://github.com/nicbk/nicbk-website/pull/123) | Green | Merged 2026-08-23 |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, its task
merged behind passing CI + human review. In short: a reader zooms to 400% to
read a small-print table, pans it smoothly on a laptop, and does the same on a
phone without the tab reloading — with the paper no blurrier and every layer
over it behaving as it did.

## Notes carried into implementation

- **The cause is paid per mounted page, not per visible page.** Five pages
  render at full magnification while one is on screen. Any fix judged only by
  "the visible page got cheaper" has measured the smaller half.
- **The measurement is the acceptance criterion.** 26 MB at fit width, 620 MB at
  400%, 3.8 s per zoom step — recorded in [research.md](./research.md) with the
  conditions they were taken under, so the after-numbers mean something.
- **The magnifier draws from the page image.** It is the one existing feature
  whose behaviour changes as a side effect of pinning the base layer's scale,
  and it is invisible in a diff. See the plan's risk section.
- **`blank-paper.ts`'s attribute is load-bearing**, not decoration: the click
  that deselects a mark asks "was this the bare paper?" through it.
- **Nothing new may reach a CDN.** `default-src 'self'` is decided; the pdfium
  wasm is imported through Vite for that reason, and any asset a new package
  wants gets the same treatment.
- **The zoom cap is not the fix.** 10× is the plugin's default and the presets
  stop at 400%; narrowing the range would hide the defect rather than remove it.

## Log

- 2026-08-23 — **Merged as `0907859` and the feature is complete**, same day it
  was spec'd. #120 closed by hand. What is left open on purpose is the one thing
  a desktop cannot answer: whether an iPhone's tab now survives the top of the
  zoom range. The task's status says so plainly rather than implying it was
  checked.
- 2026-08-23 — **Task implemented and browser-verified.** At 400% the reader
  went from 620 MB of decoded image to 62 MB, and a zoom step from 3825 ms to
  193 ms; at fit width it costs about twice what it did, which is the base
  layer's fixed price and is spent deliberately (the task's status has the
  table and the reasoning). Nothing over the paper regressed — the click that
  puts a mark down, text selection, the touch handles and the magnifier were all
  exercised at 480%.
- 2026-08-23 — **Feature spec'd**, from two symptoms the user reported the same
  day #12's task 6 merged: choppy panning at high zoom on a desktop, and a tab
  that reloads on iOS. Measured before it was spec'd, which is what showed the
  two to be one cause and put them here rather than in #12 — the render pipeline
  hurts a mouse exactly as much as a thumb. The pinch defect reported in the same
  message stayed in #12 as task 7 for the same reason, in reverse.
