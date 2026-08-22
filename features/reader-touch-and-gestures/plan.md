# Plan: Reader Touch and Gestures

Three tasks, sequential, each gated by its own PR + CI + human review. The order
is not arbitrary: **task 2 can undo task 1 if it is done first**, and task 3 is
independent of both.

## Task sequence

### 1. [`gestures`](./tasks/gestures/status.md) — pinch, on a trackpad and a touchscreen

Mount EmbedPDF's `ZoomGestureWrapper` inside the reader's viewport, with both
`enablePinch` and `enableWheel`. This is the smallest task and the one with the
least of this project's own code in it — the component exists, ships both
gestures on by default, and was simply never rendered.

First because it is the one task whose result the next task must not break: with
`touch-action: none` in place today, two-finger touch events reach the page
uninterrupted, so touch pinch works *before* the touch model changes and must go
on working after. Doing this first makes that a regression the next task can be
checked against rather than a behaviour it has to invent.

### 2. [`touch-scrolling`](./tasks/touch-scrolling/status.md) — the touch model

Give `pointerMode` `wantsRawTouch: false` so a one-finger drag scrolls, keep
raw touch for a live tool's mode, and build long-press-to-select on top.

Second because it is the largest and the least certain. Two of its three parts
are configuration of a lever the library already has; the third — long press —
has no support in EmbedPDF at all and is this feature's one piece of genuinely
novel interaction code. Its task spec carries the fallback if that fails.

The interaction with task 1 is the thing to watch: clearing `touch-action`
entirely would hand pinch back to the browser and undo task 1, so the pages must
permit panning while reserving pinch (`touch-action: pan-y`, or whichever axis
the scroll strategy uses).

### 3. [`click-away`](./tasks/click-away/status.md) — deselect without creating

Make the click that deselects a mark spend itself on deselecting. Independent of
the other two — it is a pointer behaviour, touched by no gesture — so it is last
by size rather than by dependency, and could equally be first if the touch work
turns out to need splitting.

## What this plan deliberately does not do

- **It does not reverse either decision that produces the task-3 defect.** The
  sticky tool and the engine's click-to-create are both wanted; the fix is to
  remove what they produce *together* on one specific click.
- **It does not add a gesture vocabulary.** Every gesture here has an existing
  non-gesture equivalent, which is what keeps the accessibility criterion
  satisfiable.
- **It does not touch layout.** #9 verified the reader at 420px; this feature
  changes what a hand does, not where anything sits.

## Risk, stated once

The long press is the only part of this feature that could fail to be buildable
as decided. If EmbedPDF's selection model cannot be driven from a synthetic
hold — the plugin exposes `setSelection(range)` and glyph-index pointers, so the
raw material is there, but nothing is designed for this — the fallback is to
raise it and re-decide the touch model with the user rather than to ship a
gesture that half-works. Task 2's spec says so in its own words.
