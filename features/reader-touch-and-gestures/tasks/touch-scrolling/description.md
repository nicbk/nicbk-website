# Task: Touch Scrolling

**Second of four.** One finger scrolls the paper.

On a phone, dragging the paper starts a text selection and the document does not
move. A reader cannot read. This is the reported problem, and it is a regression
against a decided rule — `design-system.md` (2026-08-09) says scrolling is
untouched site-wide and "wheel, trackpad, keyboard, and touch all work".

## What it does

- **Stops the reader claiming every touch.** The interaction manager puts
  `touch-action: none` on every page whenever the active mode does not say
  otherwise, and the library's own default mode never says otherwise. That one
  default is why touch does nothing.
- **Leaves the paper pannable and pinch reserved.** Panning goes to the browser,
  which does it far better than JavaScript can; the two-finger gesture stays
  with task 1's zoom wrapper.
- **Keeps a live tool's touch.** A tool chosen from the menu still draws with a
  one-finger drag, which is the same "the tool stays live until you put it down"
  the creation flow already decided.

## What it does not do

- **It does not implement selecting text by touch.** That is now
  [`touch-selection`](../touch-selection/status.md), task 4, after the model it
  needs was re-decided mid-task — see below. **Until that ships, a touch user can
  scroll, zoom and annotate, but cannot select a passage.** That is a real gap,
  accepted deliberately with the user so reading on a phone is not held hostage
  to it.
- **It does not clear `touch-action` outright.** That would return the
  two-finger gesture to the browser and undo task 1.
- **It does not change what a pointer does.** Mouse and trackpad behaviour is
  untouched.

## Why this task shrank

It was specified to carry the whole touch model, including "long press, then
drag to select". That turned out to be unbuildable: a browser latches its
`touch-action` decision when a gesture starts, so a finger that holds cannot
reclaim a touch the browser is already allowed to pan. The spec's own fallback
said to raise it and re-decide rather than ship a half-working gesture, which is
what happened — the corrected model is in
[reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
2026-08-22 revision, and the work it implies is task 4.

What is left here is the part that was never in doubt, and it is the part the
user actually reported.

## Exit state

A reader on a phone drags a thumb and the paper scrolls, stopping at the end of
the reader's own panel rather than dragging the page behind it. Two fingers
still pinch. Choosing a tool returns the drag to drawing, and putting the tool
down returns it to scrolling.
