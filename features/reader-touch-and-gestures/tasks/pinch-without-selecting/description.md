# Task: Pinch Without Selecting

**Task 7 of [#12](../../description.md)**, added 2026-08-23 from a user report,
and — like task 6 — **run before task 5**: it repairs behaviour the reader
already has in front of them.

A two-finger pinch zooms the paper and does nothing else.

## Why it exists

Reported by the user on 2026-08-23: pinching on a touchscreen either selects
text or sets the live tool drawing. Task 1 mounted the zoom gesture; what it
could not do is take the gesture away from everything else, because
**nothing in EmbedPDF's pointer path knows what a second finger means**. The
interaction manager translates every pointer from every finger into the page's
handler chain with no multi-touch guard at all, so during a pinch:

- the selection plugin's text handler **anchors on each finger's press** and
  begins a drag selection three page units later — text gets selected while
  the reader is zooming;
- that same press handler **clears whatever was selected** before it anchors, so
  a pinch destroys a selection the reader had already made;
- and with a tool live, the tool's own handlers hear the press and every move,
  so **the pinch draws a mark**.

Task 4's guard withholds a touch press's moves, but only while *one* press is in
flight: the second finger ends the first press, and from that instant the moves
flow again.

## What it changes

- **A second finger ends the gesture as far as the reader's own code is
  concerned.** The live tool is told its pointer was cancelled — the same
  bookkeeping task 6 established, and for the same reason — and every further
  press and movement is withheld until the last finger lifts.
- **The lifts are let through.** They are the only thing that makes the
  selection plugin's text handler drop its anchor, and a stranded anchor is what
  turned three earlier fixes in this feature into new defects.
- **A selection that existed before the pinch is put back**, because the first
  finger's press has already cleared it by the time a pinch can be recognised.

## What it does not change

- **Not the zoom itself.** `ZoomGestureWrapper` keeps the gesture, the maths and
  the anchoring; this only stops other things acting on the same fingers.
- **Not one-finger behaviour.** Scrolling (task 2), the long press (task 4) and
  the press that puts a mark down (task 6) are untouched — a single press must
  behave exactly as it does today, since it cannot know a second finger is
  coming.
- **Not the mouse.** A trackpad pinch arrives as ctrl+wheel and never enters the
  pointer path this task guards.
- **No new stored data, no schema change.**
