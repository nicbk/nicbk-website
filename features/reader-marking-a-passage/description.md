# Feature: Reader Marking a Passage

**#15** in [../index.md](../index.md). Making the reader's text tools reachable
from the selections a reader actually makes.

## What it is

The reader has four tools that act on selected text — highlight, underline,
strikeout, squiggly — and a reader who has selected a passage often cannot use
any of them. This feature makes marking work from every selection the reader can
make, and fixes the missing copy control that shares its cause.

Three symptoms, measured on 2026-09-11 (see [research.md](./research.md)):

- **A passage selected by touch cannot be marked at all.** The whole touch
  selection path that #12 built ends at the copy control.
- **A markup tool dragged across a page break marks nothing**, though the same
  drag inside one page marks correctly.
- **A selection that spans a page break shows no copy control**, though ⌘C still
  copies it. Not reported by the user — found while measuring the other two.

## Why it is one feature and not three

Because they are one cause wearing three faces: **nothing tells the reader that
a selection has finished**. Everything that acts on a completed selection —
committing a markup tool, placing the floating menu — waits on the selection
plugin's end-of-selection event, and that event is not emitted for a
programmatic selection, nor for a drag whose pointer is released over a page
other than the one it began on.

## What it delivers

- A selection **finishes exactly once**, whoever made it and however many pages
  it covers, and everything that depends on that happens.
- **Marking from the selection itself**: the floating control that offers `copy`
  also offers the text tools, so a passage is marked where it was selected
  rather than by reaching for a toolbar that would clear it.

## What it does not do

- **No new tools, and no change to the twelve that exist.** The draw tools and
  the sticky-tool flow are #9's and stay exactly as they are.
- **No change to how a selection is made.** The hold, the handles, the magnifier
  and the cross-page drag are #12's and are not revisited.
- **No library fork.** The fix is built on EmbedPDF's public API, decided with
  the user on 2026-09-11; see [research.md](./research.md) for the alternative
  that was weighed and declined.

## Exit state

A reader selects a sentence with a finger, taps *highlight*, and the sentence is
highlighted — on one page or across a break. A reader with a mouse drags a
markup tool across a page break and gets the same mark. A selection that spans
two pages offers its copy control like any other.
