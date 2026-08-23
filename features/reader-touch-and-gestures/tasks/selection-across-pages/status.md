# Status: Selection Across Pages

**State:** Not started. Fifth of six by filing order, and **last to merge** —
task 6 was filed after it and runs before it, being a repair rather than an
addition.

- Branch: `reader-touch-and-gestures/selection-across-pages`, from `main` after
  task 6 merges — it was task 4 when this was filed, and task 6 was placed ahead
  of it.
- Sub-issue: [**#116**](https://github.com/nicbk/nicbk-website/issues/116).
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, close this feature's parent issue #108 by hand** — GitHub does not
  close a parent when its sub-issues close, and this is still the last task to
  merge.
  (This duty moved here from task 4 when this task was split out of it, having
  moved to task 4 from task 3 for the same reason.)

## Why this task exists

Not because the work was unbuildable — this is the ordinary kind of split. Task
4 answered its three open design questions toward what a phone already does:
iOS-shaped handles, character-precise extension, and a magnifier to aim with.
Each is small; together with a cross-page drag and the auto-scroll it needs, they
made one PR of four subsystems.

Split with the user on 2026-08-23, and split at this seam on purpose: precision
and the magnifier that makes precision usable ship together, so the state
between the two PRs is a finished thing that simply stops at a page edge, not a
half-built one.

## Open items to settle before writing

- **The auto-scroll's rate curve.** Proportional to distance past the edge is
  decided; the constant and the ceiling are numbers to feel on a device, and the
  case that decides them is a slow extension of two or three lines, not a sprint
  down a page.
- **Whether the magnifier survives the page break** or hides while the finger is
  over the gap between pages. It has nothing to show there.
- **Whether a page still being rendered can be selected into.** Pages are
  virtualized; a fast auto-scroll can outrun the render, and geometry for a page
  that has not registered is not loaded.

## Log

- 2026-08-23 — Filed mid-feature, when task 4's settled design made a single PR
  too large to review well.
