# Status: Surface Layering

**Feature state:** **Complete** (2026-09-13) — both tasks merged behind green CI
and human review, and parent issue #149 closed by hand. Two tasks, each gated by
its own PR + CI + human review. The spec itself is
[PR #152](https://github.com/nicbk/nicbk-website/pull/152).

**One check is still outstanding, and it is the one this feature is about.**
Neither task's build has been run in Safari — `localhost:3000` has no session
there and signing in is not the agent's to do — so both fixes were verified in
Chrome only. Task 1's *rule* was verified in Safari beforehand, on `nicbk.com`,
including both regressions; task 2's placement is geometry rather than paint
order, so it is far less engine-sensitive. Both of those are arguments, and this
feature exists because an argument exactly like them was wrong. See
[Open: the Safari pass](#open-the-safari-pass) below.

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

## Open: the Safari pass

Neither task's build has run in Safari. `localhost:3000` carries no session
there, and signing in is outside what the agent may do.

What that leaves for each:

- **Task 1** — its *rule* was verified in Safari before it was written, on
  `nicbk.com`: three probes over the row hit a card before, the toolbar after; a
  card menu overlapping the row still won; the modal backdrop still covered it.
  What has not run in Safari is the merged code expressing that rule.
- **Task 2** — placement is geometry, computed from rectangles, so it does not
  depend on the paint-order defaults that differ between engines. That is a good
  argument and it is still an argument.

Either is closed by signing into `localhost:3000` in Safari once — which closes
it for every check after this one too — or by checking `nicbk.com` after deploy.

## Log

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
