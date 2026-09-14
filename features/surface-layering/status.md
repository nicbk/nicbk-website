# Status: Surface Layering

**Feature state:** **Complete** (2026-09-13) — both tasks merged behind green CI
and human review, and parent issue #149 closed by hand. Two tasks, each gated by
its own PR + CI + human review. The spec itself is
[PR #152](https://github.com/nicbk/nicbk-website/pull/152).

**The Safari pass has run (2026-09-14), on `nicbk.com`, and both fixes hold.**
It had been the one outstanding check, and the one this feature is about — both
tasks were first verified in Chrome only. See
[Safari pass](#safari-pass-2026-09-14) below.

Spec written against `main` at `947d2c2`, from causes measured in **both Chrome
and Safari** rather than from the code's own comments — two of which turned out
to be wrong or too broad. See [research.md](./research.md).

Depends on [`collection-view`](../collection-view/status.md) (#8, Complete) for
the sticky control row and on
[`article-detail-and-reader`](../article-detail-and-reader/status.md) (#9,
Complete) for the reader whose toolbar and annotation box this reorders.

Feature parent issue: [**#149**](https://github.com/nicbk/nicbk-website/issues/149),
with one sub-issue per task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#16** in [../index.md](../index.md). Its parent issue was
**checked** on completion and **had not closed itself**, despite both sub-issues
closing with their PRs — so it was closed by hand, ten minutes after #151. That
is the third miss in a row, and it also refutes the one guess the lifecycle
document's addendum had on offer: #149 has two sub-issues, exactly like the one
feature that *did* auto-close. The count is not the variable. See that
document's [second addendum](../../research/project-management-conventions/issue-and-pr-lifecycle.md).

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`toolbar-above-the-collection`](./tasks/toolbar-above-the-collection/status.md) | **Merged** ([#150](https://github.com/nicbk/nicbk-website/issues/150)) | [#153](https://github.com/nicbk/nicbk-website/pull/153) | green | approved |
| [`annotation-box-above-the-toolbar`](./tasks/annotation-box-above-the-toolbar/status.md) | **Merged** ([#151](https://github.com/nicbk/nicbk-website/issues/151)) | [#154](https://github.com/nicbk/nicbk-website/pull/154) | green | approved |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, both tasks
merged behind passing CI + human review. In short: the search row stays above
the collection in both engines, a mark's controls are reachable over the reader
toolbar, the paper still is not, and both orders are written down.

## Notes carried into implementation

- **The toolbar's remedy is already verified, in Safari, including both
  regressions.** `isolation: isolate` on `.page` + `z-index: 1` on `.toolbar`:
  before, all three probes over the row hit a card; after, all three hit the
  toolbar; a card menu overlapping the row still won; the modal backdrop still
  covered it. Task 1 is writing down a measured answer, not searching for one.
- **`isolation` is the load-bearing half.** A bare `z-index: 1` was tried before
  and reverted because it lifted the row above portalled popups. Isolation is
  what confines the layer; deleting it as redundant restores two defects.
- **A maximum z-index does not escape a stacking context.** A probe at
  `2147483647` inside the reader viewport still lost to the toolbar. Any task-2
  remedy phrased as "raise the annotation box" is wrong unless it also leaves
  the subtree or removes the context.
- **Task 2 measures before it decides.** Whether the annotation box sits inside
  one of EmbedPDF's `z-index: 1` page wrappers determines whether a layer or a
  portal is the answer, and it needs a live selection to see.
- **Task 2 can re-break an older report.** The viewport's stacking context
  exists because the paper painted over the toolbar. That defect is a regression
  test, not just history.
- **Chrome is not enough any more.** This feature exists because a Chrome-only
  pass signed off a defect that has been live in production. The AGENTS.md edit
  rides with task 1.

## What the implementation changed about the spec

The notes above were carried in as expectations. Two of them held, and one was
wrong in a way that cost a re-decision:

- **"Task 2 measures before it decides" held, and the measurement said no.** The
  menu sits inside an EmbedPDF page wrapper at `z-index: 1`, inside a viewport at
  `z-index: 0`, and the toolbar is the *viewport's sibling*. So the spec's layer
  branch is impossible and its portal branch would mean re-deriving page-relative
  coordinates and the engine's counter-rotation through scroll, zoom and
  rotation. Neither was implementable as written; the remedy — **move the menu
  rather than raise it** — was re-decided with the user mid-task.
- **"Task 2 can re-break an older report" held**, and is now a standing check
  rather than history: the regression probe puts two pages under the bar and
  confirms a press over the overlap still answers `toolbar`.
- **The unit tier could not have caught any of the three defects the browser
  found** — a measurement that never ran, a "below" that landed on top of the
  mark, and a toolbar measured as four times its visible width. jsdom lays
  nothing out, so every rectangle it reports is zero. What the tests lock in is
  *when* the measurement happens and *what* it is given, which is the part that
  can regress silently.

## Safari pass (2026-09-14)

Run on `nicbk.com` against the deployed build, in the user's signed-in Safari, in
a dedicated window. Every result is a hit-test with the overlap asserted first.
Nothing was created or changed: menus and the modal were dismissed, and the
paper's mark count read 35 before and after.

**Task 1 — toolbar above the collection.** The served build carries the rule
(`.toolbar` `z-index: 1`, its parent `isolation: isolate`). The window was
shortened so the collection scrolls under the row.

| Check | Result |
|---|---|
| 3 probes over the row, a card beneath each | all hit the **toolbar** |
| regression: a card menu overlapping the row by 88px | probe in the overlap hits the **menu** |
| regression: "Add articles" modal open, probes at both ends of the row | both hit the **backdrop** |

**Task 2 — a mark's controls above the reader toolbar.** On a paper with existing
marks; the toolbar's groups measured 88–124.

| Check | Result |
|---|---|
| mark 30px under the bar (154–175) | `below`, menu 179–216: clear of the bar, not over the mark, reachable at its centre |
| mark lower on the page (372–395) | `above`, menu 331–367: the ordinary placement is unchanged |
| regression: paper under the toolbar | probe over the bar with a page beneath hits the **toolbar** |

**Worth knowing for next time:** a Safari window behind another one reports
`visibilityState: hidden`, and the reader sat at "loading…" until it was brought
forward — the same no-sync-when-hidden behaviour recorded for Chrome tabs. That
needs the user's go-ahead, since it takes focus from what they are doing.

## Log

- 2026-09-14 — **Safari pass run on `nicbk.com`; both fixes hold**, including all
  three regressions. Nothing about the feature's outcome is unverified now.
- 2026-09-13 — **Feature complete.** #154 merged, #149 closed by hand. The
  collection's search row now stays above the cards in both engines and the
  reader's mark controls are reachable, with both orders written down instead of
  left to the engine. The durable part is neither fix: `AGENTS.md` now says to
  check anything the code leaves to a default in **more than one engine**, and to
  **assert the geometry** by hit-test rather than read it off a screenshot. Both
  were written because this feature's own process failed them — the defect had
  passed review and been live in production, and two attempts to explain it
  reasoned from the code's comments instead of measuring. A third lesson arrived
  during task 2 and is worth as much: **the first browser check reported a pass
  that was not one**, because HMR had re-rendered a menu already on screen. A
  verification step with a false-positive mode is worse than none, and a full
  reload is what removes it.
- 2026-09-13 — **Spec'd**, after #11 completed. Filed from the user's reported
  list of 16 items, whose causes were measured first: this feature is the two
  that share a cause. Three hypotheses were tested and two rejected on the way —
  the toolbar's transparency, and `container-type` forming the offending
  stacking context — before the engine difference was found by testing in
  Safari, which nothing in this project had done before.
