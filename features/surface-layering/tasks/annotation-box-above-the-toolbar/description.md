# Task: Annotation Box Above the Toolbar

**Task 2 of 2.** Separating the paper from the UI drawn over the paper.

## What it does

- **Lets a mark's controls paint above the reader toolbar**, so a reader can see
  and reach what they just marked when the two overlap.
- **Keeps the pages below the toolbar**, which is the earlier report the current
  rule was added for and which this must not undo.
- **Narrows a rule that is too broad.** `pdf-reader.module.css` establishes a
  stacking context on the whole viewport so that *"nothing the engine draws can
  rise above the toolbar"*. The pages must not; the annotation UI must.

## What it does not do

- **No change to what EmbedPDF draws or where it positions it.** The engine
  keeps placing the box against the mark; this task changes only what layer that
  box ends up in.
- **No new annotation surface.** The selection menu and the note editor are #9's
  and #15's; this is about where they paint.
- **No site-wide z-index scale.** The reader's layers stay confined to the
  reader.

## Exit state

A reader marks a passage near the top of the page and the mark's controls appear
over the toolbar rather than behind it — and page one still does not cover the
bar.
