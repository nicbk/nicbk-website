# Feature: Reader Zoom Performance

**#14 in [../index.md](../index.md).** Zooming in stops costing the whole paper.

The reader draws each page as one raster image, rendered at the current zoom.
That is fine at the zoom a paper is read at and quietly ruinous past it: the
image's area grows with the *square* of the zoom, it is re-rendered from scratch
on every zoom change, and it is paid for every page the scroller has mounted —
not merely the one being looked at. At 400% on a 500px-wide window that is five
bitmaps of 4896 × 6336, about **620 MB** of decoded image to show a few
paragraphs, and a single zoom step takes **3.8 seconds** to produce the first
new page.

The user reported both ends of it on 2026-08-23: panning at high zoom is choppy
and unresponsive on a desktop, and on an iPhone the tab dies outright —
"the page encountered an issue".

## What it does

- **Renders what is on screen, not what a page would be if it were all
  visible.** At high zoom the visible region is drawn as tiles; the rest of the
  page is a cheap low-resolution base beneath them.
- **Keeps the cost of zooming roughly flat.** Doubling the zoom stops
  quadrupling the work, so panning and zooming stay responsive at magnifications
  a reader actually uses to look at a figure.
- **Stops the reader from being killed by the platform.** A phone's tab has a
  memory budget the current approach passes at ordinary zoom levels; this keeps
  the reader inside it.

## What it does not do

- **It does not change what the reader can see or do.** Same zoom range, same
  toolbar, same presets, same marks, same selection. Nothing here is a
  user-visible feature; it is the same reader, affordable.
- **It does not touch input.** Pinch, touch scrolling and the press that puts a
  mark down are feature #12's, including the pinch defect filed there as task 7.
- **It does not write its own tile logic.** EmbedPDF ships a tiling plugin for
  exactly this problem; writing a second one beside it is the duplication this
  project's guidelines forbid.
- **No new stored data, no schema change, no route.**

## Why it is a feature and not a bug list

Two symptoms — desktop lag and a phone reload — with **one cause**, measured
before anything was spec'd: a full-page bitmap per mounted page at the current
scale. They are the same defect seen through two memory budgets, which is why
this is one slice rather than two entries on a list. It is also why it is not a
task of #12: the cause is in the render pipeline and hurts a mouse exactly as
much as a thumb.

## Exit state

A reader zooms to 400% to read a small-print table, pans around it smoothly on a
laptop, and does the same on a phone without the tab reloading. The toolbar, the
marks and the text selection behave exactly as they did.
