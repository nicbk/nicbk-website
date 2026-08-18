# Task: Touch Scrolling

**Second of three, and the largest.** The touch model: what one finger does.

On a phone, dragging the paper starts a text selection and the document does not
move. A reader cannot read. This is the reported problem, and it is a regression
against a decided rule — `design-system.md` (2026-08-09) says scrolling is
untouched site-wide and "wheel, trackpad, keyboard, and touch all work".

## What it does

Implements the touch model decided with the user (2026-08-18, recorded in
[reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)):

| | no tool active | tool active |
|---|---|---|
| one finger, drag | **scrolls the paper** | draws the mark |
| one finger, long press then drag | **selects text** | draws the mark |
| two fingers | pinches to zoom | pinches to zoom |

Three parts, in rising order of novelty:

- **Give the default mode `wantsRawTouch: false`.** The library's own
  `pointerMode` leaves it unset, which resolves to `true` and puts
  `touch-action: none` on every page. That single default is why touch does
  nothing.
- **Keep raw touch for a live tool's mode**, which the annotation plugin
  registers per tool — so drawing by touch keeps working, unchanged.
- **Build long-press-to-select**, which EmbedPDF does not have.

## What it does not do

- **It does not clear `touch-action` outright.** That hands pinch back to the
  browser and undoes task 1. The pages permit panning while reserving pinch.
- **It does not change what a pointer does.** Mouse and trackpad selection,
  drawing and clicking behave exactly as they do today; this task is about the
  touch path only.
- **It does not add a mobile layout.** #9 verified the reader at 420px.

## The risk, named

**Long press is this feature's one genuinely novel interaction.** Neither the
selection plugin nor the interaction manager exposes anything in that family —
no `longPress`, no `holdDelay`. The raw material exists (`setSelection(range)`
takes glyph-index pointers, and the plugin can resolve a point to a glyph), but
nothing is designed for driving a selection from a synthetic hold.

If it cannot be made to sit correctly on top of EmbedPDF's model, **the fallback
is to raise it and re-decide the touch model with the user** — not to ship a
gesture that half-works. Selecting text by touch was chosen knowing it was the
uncertain part; scrolling was not.

## Exit state

A reader on a phone drags a thumb and the paper scrolls, stopping at the end of
the reader's own panel rather than dragging the page behind it. Holding a finger
still and then dragging selects a passage, which the copy control then offers to
copy. Choosing a tool returns the drag to drawing. Two fingers pinch throughout.
