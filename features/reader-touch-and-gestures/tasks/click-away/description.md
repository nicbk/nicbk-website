# Task: Click Away

**Third of three.** Putting a mark down should not pick up a pen.

Select a mark, then click elsewhere on the paper to deselect it: the mark
deselects *and* a new one appears where the click landed. On a page where the
reader was tidying up, they now have a stray rectangle to delete — and deleting
it is one click with no undo, so the mistake compounds.

## What it does

Makes the click that deselects a mark spend itself on deselecting. With nothing
selected, the next click creates as it always has.

## Why it happens, and what must not change

Two decisions meet, and **both are wanted**:

- `deactivateToolAfterCreate: false` — the tool stays live after a mark is made,
  decided with the user so a reader marking six passages picks the tool once
  (`reader-annotation.md`, creation-flow bullet).
- The engine's shape tools carry `clickBehavior: { enabled: true, defaultSize:
  { width: 100, height: 100 } }`, so a bare click on the page creates a mark —
  which is how a reader places a sticky note or a box without dragging.

Neither is the defect. The defect is the third thing they produce together: one
click meaning two things, one of which the reader did not ask for. So this task
removes that overlap and leaves both decisions standing.

## What it does not do

- **It does not deactivate the tool after creating.** That would trade this
  annoyance for the one the sticky tool was chosen to avoid.
- **It does not remove click-to-create.** Placing a mark with a single click
  stays.
- **It does not change the mark's floating menu.** Clicking delete, or the note
  button, or inside the note editor is not "clicking away" and is already
  handled — that menu stops its own pointer events, for reasons its own file
  records.
- **It does not touch touch.** Independent of tasks 1 and 2 entirely.

## Exit state

With a mark selected and a tool still live, one click on blank paper deselects
and draws nothing. A second click draws, as before. The reader can put something
down without picking something else up.
