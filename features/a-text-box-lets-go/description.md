# Feature: A Text Box Lets Go

**#27** in [../index.md](../index.md). A text box stays in typing mode after
the reader clicks away from it, and while it is in typing mode it cannot be
moved.

## What it is

User-reported 2026-10-11: *"when typing a text box annotation, when i click
away, there is still a typing cursor within the box and I am unable to move the
box. I have to create another text box then remove that text box."*

Reproduced in Chromium before anything was written (`research.md`): after typing
a note and clicking the bare paper, the engine still drew the box
`contenteditable="true"`, and a drag on it moved it **0px**. The drag selected
the note's own text instead.

## What it delivers

- **A press anywhere outside the note puts it down:** the paper, another page,
  the space between pages, the sidebar, the toolbar. This is how every text
  field behaves.
- **Escape puts it down too.** Escape already drops a selection, a selected
  mark and a live tool (`pdf-reader.tsx`). The note being written is a fourth
  thing being held.
- **What was typed is kept**, and survives a reload.
- **A finger that scrolls the paper does not end the note**, so the phone's
  keyboard is not dropped mid-sentence. This is the same rule the reader already
  applies to a selected mark.
- **The press still does what it was for.** Pressing the note's own delete
  control while typing deletes the note. A click on the paper with the text box
  tool still live puts the note down without making a second one, as the
  click-away guard already decides.

## What it does not do

- **No upgrade of EmbedPDF.** Neither 2.15.1 nor 3.0.0-next.14 exposes a way to
  end an edit, so an upgrade would buy nothing here.
- **No change to how a note is entered.** Double-clicking a note still starts
  editing it, and a new box still opens ready to type.

## Exit state

Write a note, click anywhere else, and drag it: the note moves.
