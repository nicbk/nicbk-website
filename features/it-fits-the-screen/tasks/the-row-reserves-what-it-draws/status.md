# Status: The Row Reserves What It Draws

**State:** Implemented, in review
([#231](https://github.com/nicbk/nicbk-website/issues/231)).

## What shipped

One declaration: **`min-width: 2.5rem`** on the upload **+**, with the
measurement and the reasoning beside it.

It is a **floor, not a declared size**. `height: 100%` and `aspect-ratio: 1`
stay, so the row still decides the height and the button is still square at
whatever that turns out to be; the floor only tells layout what to keep room
for.

## The mechanism, proved rather than argued

The overrun **is** this button's drawn-minus-contributed width, exactly:

| | px |
|---|---|
| what the **+** drew | 39.5 |
| what it contributed to layout | 28.4 |
| difference | **11.1** |
| the row's measured overrun | **11.1** |

Intrinsic sizing runs before there is a height, so the width the button offered
its row was its glyph's. `.controls` is `flex-shrink: 0`, so it reserved that
and its children then overflowed it — at **every** width, desktop included.

Three candidates were tried live in the browser before one was written down:

| candidate | row's overrun | the button |
|---|---|---|
| baseline | 11px | 39.5 × 39.5 |
| `min-width` on the **+** | **0** | 40 × 40 |
| `width: max-content` on `.controls` | 11px | unchanged |
| a declared `2.5rem` square | 0 | 40 × 40 |

`max-content` on the container does nothing, which is the point: the container
cannot see a width that does not exist until the height does. The floor was
chosen over the declared square because it keeps the row in charge of the
height — a taller row still grows this button.

## What changed on screen

**The button and the row are 0.5px taller in Chrome**: 39.5 → 40, because the
floor binds and `aspect-ratio` follows it. Safari already drew 40 (recorded in
that stylesheet from an earlier report), so the two engines now agree rather
than differing by half a pixel. The search field beside it stretches to the same
40 it always did.

## Verified

- **Unit**: the stylesheet still declares the square and the stated height, and
  now declares the floor — asserted beside the existing `aspect-ratio` guard, so
  the overrun cannot come back silently.
- **Chrome, local**, reloaded first, measured as a number at 320, 375, 500, 900
  and 1400: the toolbar's, the page's and the panel's `scrollWidth -
  clientWidth` are **0** at every one, and the **+** is square at every one.
- **Safari at a real 375px**: the same three numbers are 0, the **+** is
  40 × 40, and the sync indicator's right edge now sits at **366** of 375 —
  it was clipped by the window edge before.

The panel's `overflow` and `overscroll-behavior` were not touched
(user-decided): with nothing overrunning, there is nothing to scroll sideways
and nothing to rubber-band.

## Log

- 2026-09-17 — Spec'd.
- 2026-09-17 — Implemented, after testing three candidate fixes in the browser
  and measuring the result in both engines.
