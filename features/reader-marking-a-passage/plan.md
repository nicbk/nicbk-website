# Plan: Reader Marking a Passage

Two tasks, sequential, each gated by its own PR + CI + human review.

## The seam, and why it is there

Task 1 is **a repair**: the library leaves a selection unfinished in two
situations, and everything downstream of that silently does nothing. Task 2 is
**an addition**: a new place to mark from. Splitting there means the first PR
can be judged against measurements that already exist — the copy control
appears, the cross-page markup commits — while the second is judged as a piece
of design.

It also orders them correctly. Task 2's control is placed by the same machinery
that task 1 unsticks: **a cross-page selection shows no floating control at
all** today, so building the new actions first would build them where they
cannot be reached exactly when they are most wanted.

## Task 1 — [`ending-a-selection`](./tasks/ending-a-selection/description.md)

This reader gets its own notion of a selection being finished, and acts on it
when the library does not.

- One module that answers "has this selection finished, and did the library
  notice?" — reading `getState(documentId).selecting` rather than inferring it
  from the gesture.
- When it did not: re-apply the range through `setSelection`, which clears the
  stuck flag and restores the floating control, and commit the live markup tool
  if there is one.
- Fed by the pointer machinery `touch-selection/` already owns, so there is no
  new listener competing with the ones #12 spent three tasks getting right.

**Delivers on its own:** a cross-page selection offers `copy`; a markup tool
dragged across a page break marks both pages.

## Task 2 — [`marking-from-the-selection`](./tasks/marking-from-the-selection/description.md)

The floating control gains the four text tools beside `copy`, and marking a
passage no longer requires reaching for a toolbar that would clear it.

- The actions, their labels and their layout, held to
  `reader-annotation.md`'s existing decisions about that control.
- Marking commits through the annotation capability with the chosen tool's own
  `defaults`, one mark per page the passage covers.
- **Delivers the reported defect:** a passage selected by touch can be marked.

## Risks, named up front

- **The re-apply in task 1 is a write to fix a read.** Calling `setSelection`
  with the range that is already selected is how the stuck flag is cleared, and
  it produces a selection-change event this reader also listens to. The echo has
  to arrive and be recognised as one — the same shape of problem
  `annotation-sync/` already solves for marks, and the place this task is most
  likely to go wrong. If it cannot be made to settle, the fallback is to leave
  the flag alone and place this reader's own control, which is a larger change
  and would be raised before being taken.
- **Twenty duplicated lines are twenty lines that can drift.** The commit path
  mirrors the library's `textMarkupSelectionHandler`. It is pinned to the tool's
  own `defaults` so it cannot drift on colour, opacity or flags, and the test
  tier asserts the shape it produces against a real tool definition rather than
  a fixture.
- **A second way to mark may read as clutter.** `reader-annotation.md` warns
  that two entry points to one outcome is normally one too many. The browser
  pass judges the control at realistic width with a real selection, and if it
  crowds the passage it acts on, the arrangement changes rather than the
  criterion.
- **`squiggly` may not earn its place.** Four actions plus `copy` is a wide
  control on a 500px panel. If it does not fit, the decision to take with the
  user is which tools belong there — not whether the control may overflow the
  panel.

## Sequencing

Task 1, then task 2. Both merge before the feature closes; **#15's parent issue
is closed by hand** when task 2 merges, as every feature's is.
