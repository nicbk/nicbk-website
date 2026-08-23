# Plan: Reader Zoom Performance

One task, gated by its own PR + CI + human review like every other. It is one
task because the cause is one thing and the fix is one composition change: there
is no seam inside it at which the reader would be in a finished state.

## Task sequence

### 1. [`tiled-rendering`](./tasks/tiled-rendering/status.md) — draw what is on screen

Register EmbedPDF's tiling plugin and compose its layer over a base
`RenderLayer` pinned to a low scale, so the expensive image is the visible
region rather than the whole page at full magnification.

Small in diff and load-bearing in effect, which is the shape of #12's first task
too: the library ships the component, the headless build mounts nothing for you,
and the work is composing it correctly into layers this project owns — the
paper's `data-` attribute, the page's stacking order, and the magnifier's source.

## What this plan deliberately does not do

- **It does not cap the zoom.** Capping the range would trade a reader's ability
  to look closely for an implementation's convenience, and with tiles the range
  costs what it should. If the top of the range still misbehaves on a phone
  *after* tiling, that is a finding to raise with a number attached, not a limit
  to impose pre-emptively.
- **It does not write tiling logic of this project's own.** The library's plugin
  is the decided foundation; a second implementation beside it would be the
  duplication `AGENTS.md` forbids, and this is a domain (cache eviction, render
  queues, seams) where a hand-rolled version would be worse in ways that only
  show up under load.
- **It does not touch input.** The pinch defect the user reported in the same
  breath is feature #12's task 7, deliberately separate: same gesture, different
  subsystem.
- **It does not change the layout.** Same page boxes, same scroller, same
  toolbar.

## Risk

**That the base layer's resolution is visible somewhere it matters** — most
concretely in the touch selection's magnifier, which draws from the page image
(see [research.md](./research.md)). The fallback if it does: source the lens
from the tile under the finger rather than from the base, which is more code but
no new dependency. Decided by looking at it in a browser, not by argument.

The second, smaller risk is **a tile grid that is visibly a grid** — seams
between tiles as they arrive. The plugin has `overlapPx` for exactly that, so
the answer if it appears is a configured number rather than a redesign.
