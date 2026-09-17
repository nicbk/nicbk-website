# Research: It Fits the Screen

Measured on 2026-09-17, in Chrome against the local stack, before the spec was
written. The three defects were reported together; two of them turned out not to
be what they looked like.

## 1. The reader's menus have no horizontal rule

`menu-placement.ts` is the only code that positions them, and it answers one
question: `'above' | 'below'`, to dodge the reader's toolbar. Nothing anywhere
reads the viewport's left or right edge.

What each surface declares:

| surface | width | positioned by |
|---|---|---|
| a mark's controls (`annotation-selection-menu`) | **no cap** | `position: absolute` on the mark's box, `left` unset |
| a selection's bar (`selection-menu`) | `max-width: 21rem` (336px) | the same |
| the note editor (`annotation-note-editor`) | `width: min(20rem, 60vw)` | the same |

So on a 375px screen a mark more than ~39px from the left has its controls
partly off it, and the cap does not move them back: **a cap is not a position.**

**Every other floating surface is already guarded**, by Base UI's collision
avoidance *and* a declared cap:

| guarded | cap |
|---|---|
| account settings | `calc(100vw - 2 * --space-lg)` |
| credits, article menu, upload status, annotation tools, citation preview | `calc(100vw - 2 * --space-md)` |
| the path's fold | `min(28rem, calc(100vw - 2 * --space-md))` |
| the zoom menu | none declared, but short and portalled |

That is the pattern to match, and it is why the fix belongs to the three
hand-positioned surfaces rather than to a sweep of everything.

**A caution for whoever measures this.** Emulating a narrow viewport with CSS
`zoom` does **not** work here: `vw` units keep resolving against the real
viewport, so a guarded popup measures as if it were unguarded (the account
settings popup read 407.7px wide inside a "375px" viewport, overhanging both
edges — an artifact, not a defect). A real narrow viewport is the only honest
measurement, which on this machine means Safari with its window bounds set.

## 2. The collection's 11.1px overrun, at every width

Measured at a 500px viewport, on the toolbar row:

| | px |
|---|---|
| the row's content box | 12.5 → 487.5 |
| what its controls reserve | 374.7 → 487.5 (112.8 wide) |
| what its controls draw | 374.7 → **498.6** (123.9 wide) |
| **overrun** | **11.1** |

The same 10–11px at 500, 460, 430, 414, 400, 390, 375, 360 and 320 — it does not
depend on the viewport at all.

**Why.** The upload **+** (`upload-modal.module.css`) is `height: 100%;
aspect-ratio: 1`. Its height comes from `align-items: stretch` on the row, and
its width from that height — but during intrinsic sizing there is no height yet,
so the width it contributes is its glyph's, 28.4px, while it draws 39.5px
(Chrome) or 40px (Safari, recorded in that stylesheet from an earlier report).
`.controls` is `flex-shrink: 0` with `flex-basis: auto`, so it reserves the
intrinsic sum and its children then overflow it.

**Why it shows on a phone and not on a desk.** The panel insets its content by
12.5px each side, which absorbs the overrun at a wide width. At 375px the drawn
edge lands at 361 of a 362.5px content box — inside by 1.5px in Chrome, and
Safari draws each square control 0.5px wider.

**What turns an overrun into a scroll.** `lit-tracker-shell.module.css`
declares `overflow-y: auto` on the panel; the other axis then computes to `auto`
rather than `visible`, so the panel scrolls horizontally. `overscroll-behavior`
is declared on `y` only — deliberately, so a gesture on the other axis is not
swallowed — which is the rubber-band the user saw.

## 3. The citations row is the same at every width

The hypothesis going in was a desktop-only pull-up
(`margin-top: calc(--space-md - --space-lg)`) eating the gap on a phone. It is
wrong. Measured:

| | 500px | 1400px |
|---|---|---|
| navbar bottom → row top | 16px | 16px |
| controls bottom → the rule | 2.2px | 1.1px |
| the row's rule vs the sidebar's | — | **0px** |

The geometry is identical; the pull-up is doing exactly its job. What changes on
a phone is *what is in the row*: the sidebar sheet's trigger appears, and it is
**bordered**, so the 2px clearance that was invisible under a borderless "⋯"
becomes a box sitting on a line.

The row is 27.5px tall because `.tab` sets `line-height: 1.25` so its rule meets
the sidebar's — a constraint from an earlier user report, and one that only
exists while the sidebar is beside it.

## Sources

- `src/routes/lit-tracker/-article-detail/reader/menu-placement.ts`,
  `annotation-selection-menu.module.css`, `selection-menu.module.css`,
  `annotation-note-editor.module.css`.
- `src/routes/lit-tracker/-components/upload-modal/upload-modal.module.css` —
  the square button, and its own record of Safari's 40px.
- `src/routes/lit-tracker/-components/collection-toolbar/collection-toolbar.module.css`.
- `src/routes/lit-tracker/-components/lit-tracker-shell/lit-tracker-shell.module.css`.
- `src/routes/lit-tracker/-article-detail/citations/citations-view.module.css`.
- Chrome 141 on the local stack, viewports 320–1400.
