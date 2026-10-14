# Feature: The Contents Fold

**#30** in [../index.md](../index.md). The first request of 2026-10-14,
recorded in
[../../research/requests/2026-10-14/collapsible-outline.md](../../research/requests/2026-10-14/collapsible-outline.md)
(requirements O1–O5):

> let's make the outline list collapsible (oftentimes the outline is
> hierarchical, and as currently shown, all headings are listed linearly which
> is too much on certain documents. Instead, the outline should be fully
> collapsed when accessed for the first time. Then, similar to how the scroll
> position in the page is preserved, let's also preserve the current collapse
> state of the outline for future accesses of the document.

## What it is

The contents tab (#29) lists every entry of a paper's outline in one indented
column. A textbook's 250-entry, three-level outline is hundreds of rows to
scroll past to reach chapter 9 (research §1).

## What it delivers

- **An entry with sections under it folds.** It has its own control to show or
  hide them. The title still takes the reader to the section.
- **The first time a paper's contents are opened, every entry is folded.** Only
  the top level shows.
- **The folds are kept with the paper**, on the account, as the reading place
  is (#23). The contents reopen as they were left, on any device, in the rail
  and in the sheet alike.

## What it does not do

- **No "open all" or "close all".** One more control in a 143px rail, for a
  state a few presses reach. Revisit if the user asks.
- **Choosing an entry never folds or opens anything.** Navigation and folding
  are separate, so a jump never changes what is saved.
- **No change to how contents are found** (#29, tasks 1–2).

## Exit state

A textbook's contents open as a short list of chapters. The reader opens the
chapter they want, and finds the list as they left it the next time they open
the paper, on this device or another.
