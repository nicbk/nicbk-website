# Feature: A Citation Opens the Paper

**#25** in [../index.md](../index.md). Clicking a citation shows the reference
it points at, but not the paper — even when that paper is in the collection.

## What it is

#22 made a citation previewable: clicking `[13]` shows reference 13 in place,
as a crop of the page, with **go to p. N**. #10 made the same relationship
navigable from the sidebar: the *cites* list opens any referenced paper the
collection holds.

The two never meet. A reader looking at `[13]` in the middle of a paragraph can
see what it says and cannot open it, even when they have the paper; they have to
leave the passage, open Citations, and find the row by title.

## What it delivers

- **"open in tracker" in the preview**, beside *go to p. N*, whenever the
  reference being previewed is a paper in the collection. It opens that paper's
  reader.
- **The hop is recorded**, exactly as following the same reference from the
  Citations tab would: the header shows `Attention Is All You Need ›cites BERT…`,
  with #10's rules — a revisit cuts the path back.
- **Nothing new when the paper is not there.** The preview is what it was: the
  entry, and a way to go to it.

## How a citation is matched to a paper

Not by text, and not by the reference's number. GROBID already parses every
bibliography this pipeline reads; asked for coordinates, it returns each entry's
own rectangles on the page (`research.md`). Storing those against the edge the
entry became turns "which reference is this preview showing?" into a rectangle
overlap, which is the same answer for a numbered style, an author-year style, or
a paper whose reference numbers do not match its entry order.

## What it does not do

- **No new clickable layer over the page.** Only the preview that already opens
  gains an action. GROBID also locates every in-text marker, which would make a
  citation clickable in a PDF that carries no links at all — decided with the
  user to leave that until this has been used.
- **It does not change what the preview shows**, or how it is reached.
- **No reference editing.** Still deferred, and still unowned by any feature.

## Exit state

Reading a paper, clicking a citation to something in your collection, and
opening it — without leaving the passage to go looking for it.
