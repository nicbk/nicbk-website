# Task: The Upload Controls Look Finished

Task 2 of 2 of [controls-look-like-controls](../../description.md) (#18).

## What it does

Three fixes to one cluster — the "+" on the collection toolbar, the picker modal
it opens, and the status indicator beside it.

### The "+" becomes square

Measured at **28.4 × 39.5px**, aspect 0.72. Its width is what it needs (4px
padding ×2 + an 18.4px icon + 2px border); its height is whatever the search
field beside it happens to be, because `.controls` uses `align-items: stretch`.

The button sizes itself. **The stretch stays** — it was added because three
separately-sized controls looked ragged in a row, and that problem is still real.
What changes is that the "+" is no longer a passenger of it.

### The file field gets drawn

The picker is a bare native `<input type="file">`: 359 × 25px, `border: none`,
transparent, no padding, no radius. It gains a dotted boundary and the padding to
read as somewhere a file goes.

**It stays the native control.** Multi-select, keyboard operation and the
platform dialog all come free and would have to be rebuilt otherwise; the
stylesheet already records that decision. The button part is a vendor
pseudo-element and out of reach — the box around it is what is being styled.

### The spinner's box becomes a whole number of pixels

`1.15em` at the toolbar's 16px is **18.4px**, which puts the rotation centre at
9.2px, off the pixel grid. That is the one measured candidate for the reported
wobble.

**It is a candidate, not a cure.** The obvious explanation was checked and ruled
out — lucide's `LoaderCircle` is `M21 12a9 9 0 1 1-6.219-8.56`, an arc of a
circle on the viewBox centre, so the art is centred and the pivot is right. A
frozen-phase probe could not resolve a sub-pixel drift at the available zoom, so
**the user judges whether the wobble is gone** (user-decided 2026-09-13).

## What it does not change

- The row's `align-items: stretch`, or the heights of the other controls in it.
- The upload flow, the modal's contents, or what the status indicator reports.
- The spinner's animation, duration, or its `prefers-reduced-motion` gate.
- The icon used anywhere — only the box it is drawn in.

## Why these three are one task

They are the same surface and the same kind of defect: controls that work and
look unfinished. Three PRs would be three reviews of what reads in one sitting,
and folding them into task 1 would mix an affordance decision with cosmetics.
