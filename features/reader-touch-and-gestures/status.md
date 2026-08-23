# Status: Reader Touch and Gestures

**Feature state:** **In progress** — tasks 1 and 2 merged, task 3 in progress. **Four**
tasks: three spec'd up front plus one added on 2026-08-22, when task 2's
implementation proved part of the decided touch model unbuildable (see the log).
Sequential, each gated by its own PR + CI + human review.

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
| [`gestures`](./tasks/gestures/status.md) ([#109](https://github.com/nicbk/nicbk-website/issues/109)) | **Merged** | [#110](https://github.com/nicbk/nicbk-website/pull/110) | Green | Merged 2026-08-22 |
| [`touch-scrolling`](./tasks/touch-scrolling/status.md) ([#111](https://github.com/nicbk/nicbk-website/issues/111)) | **Merged** | [#113](https://github.com/nicbk/nicbk-website/pull/113) | Green | Merged 2026-08-23 |
| [`click-away`](./tasks/click-away/status.md) ([#114](https://github.com/nicbk/nicbk-website/issues/114)) | **In progress** | — | — | — |
| [`touch-selection`](./tasks/touch-selection/status.md) ([#112](https://github.com/nicbk/nicbk-website/issues/112)) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, each task
merged behind its own passing CI + human review. In short: a reader on a phone
scrolls the paper with a thumb, pinches to zoom a figure, and long-presses to
select a passage worth copying; a reader on a laptop pinches the trackpad and
the paper zooms rather than the page; and clicking away from a mark puts it down
without drawing another.

## Notes carried into implementation

- **The touch model was re-decided mid-feature, and the correction matters more
  than the original.** One finger scrolls, two pinch, a live tool takes the drag
  back — all unchanged. What changed is selection: **long press selects the word
  under the finger and handles extend it**, because "long press then drag"
  required reclaiming a gesture the browser had already been allowed to pan, and
  no API does that. See
  [reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
  **2026-08-22** revision, which corrects the 2026-08-18 one.
- **`wantsRawTouch` does not route touch**, whatever its name suggests: the
  interaction manager attaches touch listeners only when `PointerEvent` is
  undefined. Its one real effect is whether `touch-action: none` is set. This
  misled the original spec and is the reason the model above needed correcting.
- **Task 2 can undo task 1.** Clearing `touch-action` outright returns pinch to
  the browser, which is the opposite of what task 1 delivers. The pages must
  permit panning while reserving pinch.
- ~~**Long press has no library support**, this feature's named risk.~~ **The
  risk landed**, and the fallback in [plan.md](./plan.md) was taken exactly as
  written: raised, re-decided with the user, split into task 4 rather than
  shipped half-working. The pieces the corrected model needs — `glyphAt`,
  `expandToWordBoundary`, `setSelection` — are all public.
- **A gap is open between tasks 2 and 4**: touch can scroll, zoom and annotate
  but cannot select, so #9's copy control is unreachable by touch alone in that
  window. Accepted with the user; recorded so it is visible rather than
  discovered.
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
