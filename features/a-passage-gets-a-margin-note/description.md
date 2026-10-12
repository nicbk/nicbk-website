# Feature: A Passage Gets a Margin Note

**#28** in [../index.md](../index.md). Annotating the way a reader does on paper:
mark a passage, then write beside it in the margin, in one step instead of five.

## What it is

User-requested 2026-10-11: *"one way that I often annotate is by highlighting
some text and then writing in the margins of the page. What if … highlighting
automatically adds text box in the margin that we can type into? this would be
lower friction."*

Today that takes five steps:
1. select the passage;
2. choose *highlight*;
3. open the tool menu and choose *text box*;
4. click the margin at the right height;
5. type.

The box that results knows nothing of the passage it is about. It can be dragged
away from it, and it outlives it when the highlight is deleted.

## What it delivers

- **One action on a selected passage: *note*.** It highlights the passage and
  opens a text box in the margin beside it, ready to type.
- **In the nearer margin, level with the passage.** The side is decided by which
  half of the text block the passage sits in, so a two-column paper's left
  column writes left and its right column writes right.
- **Refused rather than overlapped.** If the box cannot go there without
  covering another annotation, nothing is made and the menu says why. It never
  falls back to the far margin. *(User-decided 2026-10-12.)*
- **The note belongs to its passage.**
  - **Deleting the highlight deletes the note.** Deleting the note leaves the
    highlight, which is still a highlight.
  - **The note cannot be dragged or resized by hand.** Its place is the
    passage's, so it stays consistent with it. It can still be selected, edited
    and deleted. *(User-decided 2026-10-12.)*
- **Notes make room for each other.** A new note may move other *margin notes*
  in that margin, and only margin notes, to fit. Each note stays close to its
  own passage. If no arrangement keeps every note close, the new one is
  refused. *(User-decided 2026-10-12.)*
- **A note grows to fit what is written in it**, since it cannot be resized by
  hand.

## What it does not do

- **No leader line.** A line from the margin to the passage crosses the words
  between them for any passage that does not start a line. The note's
  alignment, plus selecting either one showing both, carries the link with less
  clutter. The user's condition was "only if it adds clarity without too much
  visual clutter". EmbedPDF can draw a callout if that is ever wanted
  (`research.md`).
- **No change to the existing text box tool.** A text box placed by hand is
  still free to move. Margin notes are the ones made by *note*.
- **No sticky notes, no other markup.** *note* always highlights. The other
  three markup tools stay on the same menu, as now.

## Exit state

Select a sentence, press *note*, and type. The words appear in the margin beside
the sentence, stay there, and go when the highlight goes.
