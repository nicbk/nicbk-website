# Constraints and Behavior: Deselect Without Drawing

What the press that deselects a mark may and may not do. The feature's
acceptance criteria still describe the gestures; this describes the one press
they all have to agree about.

## Satisfied here

- **A click that deselects leaves nothing behind.** No mark is created, and no
  half-drawn shape follows the cursor afterwards — which is the reported defect.
- **A mouse drag out of bare paper still creates**, exactly as task 3 decided.
  Nobody drags a rectangle by mistake.
- **A finger that presses and moves pans the paper**, with the mark still
  selected, and draws nothing. A finger that presses and lifts puts the mark
  down.
- **Drawing by touch resumes as soon as nothing is selected.** The suspension is
  a property of the selection, not a mode the reader has to leave.
- **No tool creates on the press that deselects** — including the sticky note,
  which commits at pointer-down and so has to be stopped there.

## Must not regress

- **Task 3's own criterion**, restated above: a drag creates.
- **Task 2's touch scrolling** when no tool is live, and **task 1's pinch**.
- **Task 4's touch selection**: a hold beside a selected mark must still select
  the word, and the handles must still be draggable.
- **Drawing with a tool by touch**, whenever nothing is selected.
- **Deselecting by pressing a *different* mark**, which selects that one instead
  and must not be swallowed.

## Constraints particular to this task

- **The library's bookkeeping is the price of withholding its events.** A tool
  clears what it started on pointer-up or on pointer-cancel and at no other
  time; a press withheld from it must therefore either never reach it at all, or
  be followed by the cancel it is waiting for. This is the third time in this
  feature that a withheld event has left a library holding state — it is the
  rule to check first, not a surprise.
- **Where a press is judged depends on where its tool acts.** Tools that draw by
  dragging commit on release, so their press is judged at its end; the sticky
  note commits on press, so its press is stopped at its start. Both are the same
  rule applied where it bites.
- **Two thresholds, two jobs.** The mouse's "did it move" must agree with the
  engine's own click detector, which measures in page units — task 3 pins them
  together. The finger's must be in screen pixels, for the reason task 4
  records: page coordinates have the zoom divided out, so a page-unit tolerance
  tightens as the reader zooms in.
- **Panning is permitted by overriding an inline style the library owns.** The
  interaction manager writes `touch-action` on every page when a mode changes,
  and models no "something is selected" state to write a different value for.
  The override must therefore be a stylesheet rule that outranks an inline one,
  scoped to the selected state, and must give the property back untouched when
  nothing is selected.
- **Deselection moves to the end of the press for touch, and stays at its start
  for a mouse.** A finger cannot say "this is a pan, not a tap" until it has
  moved, so the decision waits; a mouse can, and a deselect that waited would
  feel late.
- **Decompose so the decision is testable without a DOM.** Which press is spent,
  and where it is judged, is a pure function of the pointer's kind, the live
  tool, and how far it travelled.

## Cross-cutting

- WCAG 2.2 AA: nothing here is the only way to do anything — Escape still puts
  down a mark, a tool, and a selection alike.
- Both themes; narrow, mid and wide.
- No stored data, no schema change, no new mutator.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
