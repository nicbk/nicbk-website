# Feature: A Note Fits the Margin

**#24** in [../index.md](../index.md). A text box written on a paper is bigger
than the paper's own text, and its default box is wider than the margin it was
meant for.

## What it is

The reader's **text box** tool (`freeText`) writes at **14pt** into a box the
engine sizes **100 × 20pt** on a click. Measured against the papers in the
collection (`research.md`):

| paper | style | left margin | body text |
|---|---|---|---|
| Attention Is All You Need | NeurIPS | 108pt | 8.6pt |
| RoBERTa | ACL | 72pt | 9.8pt |

So the default is **1.4–1.6× the size of the text it annotates**, and the box
the engine puts down is **wider than a one-inch margin before a single character
is typed**. A note meant for the margin either overflows the page or lands on
top of the paper.

## What it delivers

- **A text box defaults to 8pt in a box 72pt wide** (user-decided 2026-09-16,
  against the measurements above): smaller than the paper's own body text, so it
  reads as the reader's hand rather than as part of the paper, and narrow enough
  to sit in the narrower of the two margins without being resized first. About
  eighteen characters to a line.
- **The red stays.** `#E44234` is the engine's default and the user's choice; it
  is what makes a note read as a note.
- **Only new notes change.** A box already written keeps the size it was written
  at — its own `fontSize` is stored on the annotation.

## What it does not do

- **No size control.** One default, chosen against real margins, rather than a
  picker — the same reasoning that keeps the colour picker deferred
  (`research/ui-ux/pages/lit-tracker/components/reader-annotation.md`). If a
  second size is ever wanted, that is a decision to make then.
- **No re-sizing of existing notes**, and no migration: a stored 14pt note is a
  record of what the reader wrote, not a defect to correct.
- **Not the sticky note.** It carries its own text in a popup at the reader's UI
  size, not on the page, so a margin has nothing to do with it.
- **Not the citation jump** — following a citation to the paper it cites is
  **#25**, specified separately.

## Exit state

Choosing *text box* and clicking in a margin puts down a box that fits the
margin, in text smaller than the paper's own, ready to type in.
