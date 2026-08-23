# Task: Deselect Without Drawing

**Sixth of six, and run before task 5** — it repairs behaviour already in front
of the reader, which task 5 does not.

Task 3 stopped the click that deselects a mark from also stamping a new one, by
withholding that click's pointer-up from the live tool. The tool, though, starts
drawing on pointer-**down** and clears what it started on pointer-**up** — so
withholding the up left it mid-draw: the reader deselected a mark, moved the
mouse, and a new shape stretched out behind the cursor until they pressed again.
Reported by the user on 2026-08-24.

## What it does

Makes the press that deselects a mark spend itself, on both kinds of device —
and *only* that press.

| | mouse | touch |
|---|---|---|
| press, release without moving | deselects; nothing drawn, and nothing follows the cursor afterwards | deselects; nothing drawn |
| press, then move | draws the shape dragged out, as task 3 decided | **pans the paper**; the mark stays selected; nothing drawn or sized |

Decided with the user on 2026-08-24, and the touch column is the half that
needed deciding: a live tool currently claims every touch so that a drag can
draw, and this suspends that claim while something is selected — a finger pans
instead, and drawing resumes the moment the mark is put down.

## What it also closes

**The sticky-note tool commits on pointer-down**, not on pointer-up, so task 3's
guard never had a chance to stop it: clicking away from a selected mark with
that tool live has always left a note behind. Unreported, found while reading
the plugin for this. The same rule covers it — a press that deselects creates
nothing — and the fix is to withhold that press at its *start* for the tools
that create there.

## What it does not do

- **It does not reverse task 3.** A drag out of bare paper still creates on a
  mouse; that was decided then and is reaffirmed now.
- **It does not change what a press does when nothing is selected.** Every
  gesture in the reader is untouched until a mark is selected.
- **It does not touch text selection.** The hold, the handles and the magnifier
  are task 4's and are not revisited.

## Exit state

A reader with a rectangle tool live selects a mark, clicks the paper to put it
down, and moves the mouse: nothing follows the cursor. They press again and drag
out the next rectangle. On a phone, they press beside a selected mark and drag:
the paper scrolls under their finger and the mark stays selected. They tap
instead: the mark is put down, and the page is theirs to draw on again.
