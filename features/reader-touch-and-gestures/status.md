# Status: Reader Touch and Gestures

**Feature state:** **In progress** — tasks 1 to 4 merged, task 6 in progress.
**Six** tasks: three spec'd up front, one added on 2026-08-22 when task 2's
implementation proved part of the decided touch model unbuildable, one on
2026-08-23 when task 4's settled design made a single PR too large, and one on
2026-08-24 when the user reported what task 3's fix had left behind (see the
log). Sequential, each gated by its own PR + CI + human review. **Task 6 runs
before task 5**: it repairs shipped behaviour, and task 5 adds some.

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
| [`click-away`](./tasks/click-away/status.md) ([#114](https://github.com/nicbk/nicbk-website/issues/114)) | **Merged** | [#115](https://github.com/nicbk/nicbk-website/pull/115) | Green | Merged 2026-08-23 |
| [`touch-selection`](./tasks/touch-selection/status.md) ([#112](https://github.com/nicbk/nicbk-website/issues/112)) | **Merged** | [#117](https://github.com/nicbk/nicbk-website/pull/117) | Green | Merged 2026-08-23 |
| [`deselect-without-drawing`](./tasks/deselect-without-drawing/status.md) ([#118](https://github.com/nicbk/nicbk-website/issues/118)) | **In progress** | — | — | — |
| [`selection-across-pages`](./tasks/selection-across-pages/status.md) ([#116](https://github.com/nicbk/nicbk-website/issues/116)) | Not started, and last to merge | — | — | — |

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
- **A pointer handler cannot tell touch from mouse.** The interaction manager
  does not forward the native event — it builds a plain object with
  `clientX/clientY/target/…` and no `pointerType`. Anything that must behave
  differently for a finger has to learn the pointer's kind elsewhere. This is
  the third time this manager's shape has decided a design in this feature.
- **Handlers receive page coordinates, with the zoom already divided out.** So
  any threshold about how far a finger moved belongs in screen pixels
  (`clientX/clientY`), or it silently tightens as the reader zooms in.
- **Being first among the always-registered handlers is decided by React, not
  by the component tree.** They are walked in registration order, and the
  selection plugin registers from an ordinary effect — so a component rendered
  *earlier* still loses, because every layout effect runs before every ordinary
  one. Anything here that must pre-empt the library registers in a layout
  effect. Task 4 shipped the wrong way round first and the browser showed it.
- **Withholding an event from the library means owning what it would have
  done — including its bookkeeping.** Its text handler drops its anchor only on
  pointer-up; swallowing that leaves a stale anchor which turns the *next*
  gesture's first movement into a drag selection. This is the same family as
  the missing `onPointerCancel` recorded above, and the same lesson: the parts
  of a library that reset are as much its interface as the parts that act.
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
- 2026-08-23 — Tasks 3 and 4's boundaries both moved. Task 3 merged (#115), and
  task 4's three open design questions were settled with the user toward what a
  phone already does: **iOS-shaped handles**, **character-precise extension**,
  and a **magnifier** to aim with. That made task 4 four subsystems in one PR, so
  crossing a page break — and the auto-scroll it needs — became **task 5**
  (#116). The parent-closing duty moved with it.
- 2026-08-24 — **Task 3's fix turned out to have a tail**, reported by the user:
  the deselecting click it withholds is also the event a live tool clears its
  in-flight state on, so a half-drawn shape followed the cursor afterwards.
  Filed as task 6 and placed ahead of task 5. Two things came out of the
  reading: the **sticky note commits on pointer-down**, so that guard never
  covered it and clicking away has stamped a note since #9; and this is the
  **third** withheld-event-leaves-state defect in this feature, which is why the
  rule now lives in `AGENTS.md` instead of only in these notes.
- 2026-08-23 — Task 4 implemented and browser-verified. It closed **the half of
  the original report that was thought already fixed**: task 2 gave the pan back
  to the browser, but the library went on turning a thumb's movement into a drag
  selection, so scrolling still dragged text along with it. Worth recording at
  feature level because of what it says about the earlier task's evidence — task
  2 verified the *mechanism* that decides whether the paper scrolls, which was
  correct and was not the whole of what the user reported.
