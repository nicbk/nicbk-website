# Research: Reader Zoom Performance

Traceability for #14, per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md).

Like #12's, the load-bearing research here is **measurement** rather than a
decision to look up — but unlike #12's, half of it is measurement of the running
application rather than of the installed library.

## Decided documents this builds on

- [research/technologies/pdf-reader-annotations.md](../../research/technologies/pdf-reader-annotations.md)
  — why EmbedPDF, and why its **headless** build. That decision is why this
  feature exists in the same way it is why #12's first task did: the drop-in
  viewer composes these layers for you, and choosing headless means composing
  them deliberately. The plugin adopted here is the same library's, registered
  the same way as the eight already in `reader-plugins.ts`.
- [research/security-privacy/app-security-headers.md](../../research/security-privacy/app-security-headers.md)
  — `default-src 'self'`, which is why nothing new may fetch from a CDN.
- [research/ui-ux/pages/lit-tracker/components/reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)
  — the reader's decided interaction model. Nothing here changes it; it is cited
  because the layers this feature rearranges are the ones that model sits on.

## What was measured in the running reader

On 2026-08-23, against `main` at `33f80c4`, in Chrome at `devicePixelRatio` 2,
window 500 × 717, reading *Attention Is All You Need* (15 pages):

| zoom | pages mounted | each bitmap | decoded total |
|---|---|---|---|
| fit width (74%) | 6 | 909 × 1177 | ~26 MB |
| 400% | 5 | 4896 × 6336 | ~620 MB |
| 480% | 5 | 5875 × 7603 | ~675 MB |

and one zoom step from 400% to 480% took **3825 ms** to produce the first
re-rendered page — of five it must produce.

Two things in that table matter more than the totals. **The cost is paid per
mounted page, not per visible page**: five pages are rendered at full
magnification while at most one is on screen. And **it grows with the square of
the zoom**, because both axes scale.

## Why the platform kills the tab rather than merely slowing down

The reader's zoom is capped at **10×** by the zoom plugin's own default
(`plugin-zoom/dist/index.js`: `this.maxZoom = cfg.maxZoom ?? 10`), which the
toolbar's presets stop short of at 400% but `+` and the pinch gesture do not. At
10× on a `dpr` 2 phone one page is on the order of 12000 × 15800 — ~190
megapixels, past the per-image limits mobile Safari enforces and far past a
tab's memory budget. "The page encountered an issue" is that budget being
enforced.

## The mechanism, in the installed library

`@embedpdf/plugin-render`'s `RenderLayer` (2.15.0,
`dist/react/index.js:14-60`) renders one image per page:

```js
const actualScale = scaleOverride ?? documentState?.scale ?? 1
const actualDpr   = dprOverride   ?? window.devicePixelRatio
renderProvides.forDocument(documentId).renderPage({
  pageIndex, options: { scaleFactor: actualScale, dpr: actualDpr },
})
```

with the effect keyed on `actualScale`, so every zoom change re-renders every
mounted page in full. The reader passes no `scale`, so it takes the document's.
That is the whole cause.

## What the library provides instead

**`@embedpdf/plugin-tiling@2.15.0` exists** — same version line as the eight
plugins already registered — and is built for this exact problem: it renders the
visible region as a grid of tiles at the current scale, over a `RenderLayer`
pinned to a low scale as a base so no white space is shown while tiles arrive.
Configuration is `tileSize` (default 768 screen px), `overlapPx` (2.5), and
`extraRings` (0, meaning "no pre-rendering outside the viewport").

Read from the published package rather than only from the docs, because two
details decide how it composes into this reader:

- **`TilingLayer` renders a plain `<div>` of absolutely-positioned `<img>`
  tiles**, and spreads its remaining props onto that div. So it takes a class
  and a `data-` attribute the same way `RenderLayer` does.
- **It subscribes to `onTileRendering`** and holds only the tiles the plugin
  currently wants for that page, revoking each object URL as the image loads —
  the same lifecycle `RenderLayer` uses, so nothing new is being introduced
  about how the paper's bytes are managed.

## The interaction this feature must not break silently

The touch selection's magnifier (`touch-selection/magnifier.tsx`, feature #12
task 4) draws its lens **from the page's `<img>` element**, deriving the
image's density from `naturalWidth / clientWidth`. Pinning the base
`RenderLayer` to a low scale therefore changes what the lens has to work with at
high zoom. The arithmetic stays correct — the ratio is read from the element,
not assumed — but the picture gets softer. Named here as an open item rather
than a decision, because it is the kind of consequence that is invisible in a
diff and obvious under a thumb.
