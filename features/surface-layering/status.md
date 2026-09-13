# Status: Surface Layering

**Feature state:** **Spec'd** (2026-09-13), not started. Two tasks, each gated by
its own PR + CI + human review.

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
The roadmap entry is **#16** in [../index.md](../index.md). Its parent issue
should be **checked** when the feature completes and closed by hand if it has
not closed itself — #11's did not.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`toolbar-above-the-collection`](./tasks/toolbar-above-the-collection/status.md) | Not started ([#150](https://github.com/nicbk/nicbk-website/issues/150)) | — | — | — |
| [`annotation-box-above-the-toolbar`](./tasks/annotation-box-above-the-toolbar/status.md) | Not started ([#151](https://github.com/nicbk/nicbk-website/issues/151)) | — | — | — |

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

## Log

- 2026-09-13 — **Spec'd**, after #11 completed. Filed from the user's reported
  list of 16 items, whose causes were measured first: this feature is the two
  that share a cause. Three hypotheses were tested and two rejected on the way —
  the toolbar's transparency, and `container-type` forming the offending
  stacking context — before the engine difference was found by testing in
  Safari, which nothing in this project had done before.
