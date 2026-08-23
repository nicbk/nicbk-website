# Task: Tiled Rendering

**Task 1 of [#14](../../description.md)**, and its only one.
Issue [**#121**](https://github.com/nicbk/nicbk-website/issues/121), sub-issue of
[#120](https://github.com/nicbk/nicbk-website/issues/120).

Draw the part of the paper that is on screen, at the resolution it is being
looked at, instead of drawing every mounted page at full magnification.

## What it changes

- **Registers `@embedpdf/plugin-tiling`** alongside the eight plugins
  `reader-plugins.ts` already registers, after the three it depends on (render,
  scroll, viewport — all already there).
- **Composes `TilingLayer` over `RenderLayer`** inside each page: the render
  layer pinned to a low scale as a base so nothing is ever blank, the tile layer
  above it holding the sharp, viewport-sized pieces.
- **Moves what the paper is recognised by, if it has to.** `blank-paper.ts`'s
  attribute marks "the bare page" for the click that deselects a mark; with two
  image layers there are now two candidates for what a press lands on, and this
  task decides — deliberately and in a test — which one answers.

## What it does not change

- **The zoom range, the controls, or the gesture.** `+`, `−`, the presets, the
  percentage and the pinch feature #12 mounted all keep reading and writing the
  same single zoom state.
- **The page box.** Every layer over the paper positions against it, and the
  scroller computes it; this task adds a layer inside that box and moves nothing.
- **Anything about input.** No pointer handler, no interaction mode, no
  `touch-action`.
- **Any stored data.** No table, no mutator, no route, no migration.

## Why this is one task and not two

There is no state between "the plugin is registered" and "the layer is composed"
in which the reader is a finished thing: registering a tiling plugin that
nothing renders changes nothing, and rendering tiles without the plugin is
impossible. The seam that *would* exist — tuning `tileSize` and `overlapPx` —
is a number, not a slice.
