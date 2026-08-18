# Status: Reader Touch and Gestures

**Feature state:** **In progress** — spec'd 2026-08-18, task 1 starting. Three
tasks, sequential, each gated by its own PR + CI + human review.

Depends on [`article-detail-and-reader`](../article-detail-and-reader/status.md)
(#9, Complete) for the reader itself, its plugin registration, its toolbar, and
the interaction decisions this feature extends.

Feature parent issue: [**#108**](https://github.com/nicbk/nicbk-website/issues/108),
with one sub-issue per task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#12** in [../index.md](../index.md). When the feature
completes, its parent issue **must be closed by hand** — GitHub does not close a
parent when its sub-issues close.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`gestures`](./tasks/gestures/status.md) ([#109](https://github.com/nicbk/nicbk-website/issues/109)) | **In progress** | — | — | — |
| [`touch-scrolling`](./tasks/touch-scrolling/status.md) | Not started | — | — | — |
| [`click-away`](./tasks/click-away/status.md) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, each task
merged behind its own passing CI + human review. In short: a reader on a phone
scrolls the paper with a thumb, pinches to zoom a figure, and long-presses to
select a passage worth copying; a reader on a laptop pinches the trackpad and
the paper zooms rather than the page; and clicking away from a mark puts it down
without drawing another.

## Notes carried into implementation

- **The touch model is decided, and it is per-mode.** One finger scrolls with no
  tool active, long-press selects, two fingers pinch, and a live tool takes
  one-finger drags back. EmbedPDF's `wantsRawTouch` is a property of an
  *interaction mode* and the annotation plugin registers one per tool, so the
  decided model maps onto the library's own lever rather than fighting it. See
  [reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
  2026-08-18 revision.
- **Task 2 can undo task 1.** Clearing `touch-action` outright returns pinch to
  the browser, which is the opposite of what task 1 delivers. The pages must
  permit panning while reserving pinch.
- **Long press has no library support** and is this feature's one genuinely
  novel interaction. Raised as a risk in [plan.md](./plan.md), with the fallback
  named there: re-decide with the user rather than ship a half-working gesture.
- **Neither decision behind the task-3 defect is to be reversed.** The sticky
  tool and click-to-create are both wanted; what is unwanted is the third thing
  they do together.
- **This restores a decided property, it does not add one.**
  `design-system.md` (2026-08-09) already says touch scrolling works site-wide.
  In the reader it does not. That framing matters for review: the bar is the
  decided rule, not "better than before".
- **Both Playwright tiers stay suspended**, so the browser pass is primary
  evidence — and for this feature it must involve real or emulated touch, with
  the status saying which.
- **Separated type imports**, as everywhere.

## Log

- 2026-08-18 — **Feature spec'd**, the day #9 completed, from five ergonomic
  problems the user reported after using the finished reader. Research first,
  and it changed the shape of the work twice: three of the reported symptoms
  collapsed into **one missing component** (`ZoomGestureWrapper`, which ships
  both pinch and ctrl-wheel enabled by default and was never mounted) plus
  **one library default** (`pointerMode` leaving `wantsRawTouch` unset, so every
  page carries `touch-action: none`); and the fifth symptom turned out to belong
  to a different subsystem entirely and became **#13**. The touch model was
  decided with the user before any of it was spec'd, since
  `reader-annotation.md` had never considered touch at all.
