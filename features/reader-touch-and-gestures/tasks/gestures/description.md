# Task: Gestures

**First of three.** Pinch to zoom, on a trackpad and on a touchscreen.

The reader has zoom controls and no zoom gestures. On a laptop, pinching the
trackpad over the paper zooms the *browser page* — chrome, sidebar, toolbar and
document together — which is the one thing a reader pinching a document does not
mean. On a touchscreen, pinching does nothing at all.

## What it does

- Mounts EmbedPDF's `ZoomGestureWrapper` inside the reader's viewport, with
  `enablePinch` and `enableWheel` — the wrapper's own defaults, stated
  explicitly because they are the point of the task.
- Leaves the toolbar's zoom controls exactly as they are. The gesture and the
  controls move the same state; there is one zoom level.

## What it does not do

- **No gesture maths of this project's own.** The pinch handling, the
  zoom-to-point, and the wheel interception are the library's. Writing a second
  implementation beside a working one is the duplication the project's
  guidelines forbid, and this component is why the headless build was still the
  right call.
- **No change to the touch model.** A one-finger drag still selects text after
  this task, and still does not scroll — that is task 2's subject, deliberately
  not smuggled in here.
- **No new controls, no new state, nothing stored.**

## Why it is first

Task 2 changes `touch-action` on the pages, which is the property that decides
whether raw touch events reach the library at all. Landing pinch first makes it
a behaviour task 2 must be checked against — a regression with a name — rather
than a thing invented later and never compared.

## Exit state

Pinching a trackpad over the paper zooms the paper and leaves the page alone.
Pinching a touchscreen zooms the paper. The percentage in the toolbar moves with
both, and the `+`/`−` controls still work.
