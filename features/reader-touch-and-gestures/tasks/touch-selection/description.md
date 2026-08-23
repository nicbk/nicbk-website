# Task: Touch Selection

**Fourth of five**, and the only one that was not in the feature's original
plan. Selecting a passage with a finger, within one page —
[task 5](../selection-across-pages/description.md) carries it across a page
break.

Task 2 gave the paper back to the browser for scrolling, and in doing so gave up
the only way a touch user could select text. Until this ships, a reader on a
phone can scroll, zoom and annotate, but cannot select a passage — which means
the copy control #9 built, and the four text-markup tools, are unreachable by
touch alone.

## What it does

Implements the touch selection model decided with the user on 2026-08-22 and
recorded in
[reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md):

- **A long press selects the word under the finger.** No drag, no contest with
  the browser — the hold happens without movement, so nothing was ever claimed.
- **Handles extend the selection.** Dragging one is a *fresh gesture beginning
  on the handle*, an element that declares `touch-action: none` for itself, so
  the browser never had a claim on it either.
- From there the selection is an ordinary one: the copy control appears over it,
  ⌘C copies it, Escape drops it, and a text-markup tool applies to it.

Two things the model left open were settled with the user on 2026-08-23, both
toward what a phone already does: the handle is **iOS's shape** — a bar at the
boundary with its dot outside the line — and extension is **character-precise
with a magnifier** following the finger, rather than snapping to whole words.
See [status.md](./status.md) for what each was chosen against.

## Why it exists as a task at all

Because the model it replaces could not be built. "Long press, then drag" needed
to reclaim a gesture the browser had already been told it could pan, and there
is no API for that. The full finding, including the two library facts that made
the original model look plausible, is in that revision and in
[task 2's status](../touch-scrolling/status.md).

## What it does not do

- **No new selection engine.** `glyphAt`, `expandToWordBoundary` and
  `setSelection` are all public in the installed EmbedPDF; this drives them.
- **No change to pointer selection.** Mouse and trackpad selection is what it
  has been since #9.
- **No selection handles for the pointer.** They are a touch affordance; a
  pointer already drags a selection directly.
- **No selection across a page break.** A handle stops at the end of its own
  page; task 5 adds the page hit-testing and edge auto-scroll that crossing one
  needs.

## Exit state

A reader on a phone presses and holds a word; it selects, with a handle at each
end. Dragging a handle grows the selection to the passage they wanted. The copy
control offers it, and a highlight tool marks it.
