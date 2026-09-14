# Status: The Upload Controls Look Finished

**State:** Implemented, awaiting review. Task 2 of 2.

- Branch: `controls-look-like-controls/the-upload-controls-look-finished`, from
  `main` at `cdcf60b` with task 1 merged.
- Sub-issue: [**#163**](https://github.com/nicbk/nicbk-website/issues/163).
- PR: **TBD**.
- **On merge this completes #18** — check the parent issue
  [#161](https://github.com/nicbk/nicbk-website/issues/161) and close it by hand,
  which four of the last five features have needed.

## Why this task exists

Three controls in the upload cluster worked and looked unfinished: a "+" measured
at 28.4 × 39.5px, a file input with no border, background, padding or radius, and
a spinner whose box was 18.4px — fractional, putting its rotation centre off the
pixel grid.

## What shipped

### The "+" is square, and the row still decides its size

`aspect-ratio: 1` on `.trigger`, with `.controls { align-items: stretch }` left
exactly as it was. That stretch is a fix in its own right — three controls each
sized to their own contents looked ragged in a row — so squaring the button by
opting out of it would have traded one defect for the older one. This way the row
still sets the height and the button is square at whatever height that is.

**Measured: 39.5 × 39.5, aspect 1.000**, from 28.4 × 39.5. It grew rather than
shrank, which also makes it a more comfortable target.

### The picker is drawn, and deliberately not a drop zone

A dashed 1px boundary, `--radius-sm`, `--space-xs` of padding and the surface
background, plus a hover that borrows the accent like the rail's find field.

**Dashed rather than solid on purpose**: a solid border would make it read as a
text field, which is the one thing it is not. And it stops short of the full
drop-target look — no large empty area, no "drag files here" — because **this
control does not accept drops**. A box that invites a drag and ignores it is
worse than the bare input. The stylesheet says where the look grows into it if
drag-and-drop is ever built.

### The spinner's box is a whole number of pixels

`1.15em` → `1.125rem`. **Measured 18 × 18, pivot at (9, 9)** — was 18.4 × 18.4
with the pivot at 9.2.

`em` could never have fixed this: the toolbar's own font-size is
`clamp(0.75rem, 2.5vw, 1rem)`, so `1.15em` is fractional at essentially every
viewport width rather than at some. The static icons keep `1.15em`, the value
every control in the tracker uses — a glyph rasterized once and never rotated
does not judder, and `1.15em` appears in **eleven** stylesheets here with the
reader deriving `--reader-control-height` from it, so changing it globally is a
different job than this one.

## What the browser measured — 2026-09-13, Chrome, local Compose stack

| Check | Result |
|---|---|
| the "+" | **39.5 × 39.5**, aspect **1.000** |
| the row still lines up | "+" and the status indicator both span 80 → 119.5 |
| `.controls` untouched | still `align-items: stretch` |
| the picker | `1px dashed rgb(118,118,118)`, radius 4px, padding 8px, surface background |
| the picker is still native | `type="file"`, `multiple: true`, `accept="application/pdf"`, focusable |
| the spinner's box | **18 × 18**, pivot (9, 9), integral |
| dark theme | picker `1px dashed rgb(138,138,138)` on `rgb(31,31,31)`; the dashed field reads clearly against the solid "upload" button below it |

No upload was performed, so **no test data was created and none needed deleting**.

## What is not verified, and why

- **The spinner actually spinning.** It only renders while a job is in flight,
  and exercising it means uploading a real PDF. Its box was measured by applying
  the rule's own class to a probe element rather than by watching one turn, so
  what is confirmed is the geometry, not the motion.
- **Whether the wobble is gone.** By design: the artifact is below what the agent
  can resolve, and the user judges. **If it persists**, the next thing to try is
  promoting the element to its own composited layer (`will-change: transform`),
  which removes this class of jitter independently of the box size — recorded in
  the stylesheet so the next attempt does not start from scratch. It was
  deliberately not done at the same time, so whichever change works gets the
  credit.
- **Phone width.** Chrome's minimum window width stops the resize at ~500px, and
  the checks above were taken at 1440. `aspect-ratio` and a dashed border do not
  depend on width, and the row's behaviour below the breakpoint is #8's and
  unchanged.

## An observation, not fixed here

The status indicator beside the "+" now measures **28.4 × 39.5** — the shape the
"+" just left. It has no border or background, so nothing about it looks
stretched, which is why this task leaves it alone. Worth knowing it is there if
that indicator ever gains a box.

## Log

- 2026-09-13 — Implemented. 1622 unit tests pass (1618 + 4). All three new tests
  were checked by reproducing their bug — removing `aspect-ratio`, restoring
  `border: none`, and putting `1.15em` back — and confirming each fails.
- 2026-09-13 — Spec'd.
