# Research: Controls Look Like Controls

Traceability into `research/*.md`, and the measurements taken before this was
spec'd.

## Decided documents this builds on

- [collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
  — the filter rail, its two groups, and the decision that **each group carries a
  quiet heading** so a reader can see that statuses are single-select and tags
  are not. Also that the rail and the narrow-screen sheet render **one component**
  over one state.
- [styling-conventions.md](../../research/coding-conventions/styling-conventions.md)
  — CSS Modules, `composes:`, hover affordances gated on `@media (hover: hover)`.
- `src/styles/contrast.test.ts` — holds `--color-text-muted` at 4.5:1 against the
  page. This is load-bearing for the remedy below.

## The measurements (2026-09-13, Chrome, local Compose stack)

All by `getComputedStyle` / `getBoundingClientRect` on the running page.

### Item 16 — the heading and the control are the same thing to look at

| | `.groupLabel` (`<h2>`) | `.toggle` (`<button>`) |
|---|---|---|
| colour | `rgb(89, 89, 89)` | `rgb(89, 89, 89)` |
| font-size | 14px | 14px |
| weight | 400 | 400 |

Rendered widths: "tags" 33.6px, "read" 33.6px. There is no visual difference at
all; the distinction is `<h2>` versus `<button>`, which is semantic only.

**The blog has the identical pairing** — `tag-filter.module.css`'s `.heading` is
a byte-for-byte duplicate of `.groupLabel`, over the same shared `TagToggle`. It
survives only because the blog writes its tags `#name` (the toggle's `hash`
prop), so the `#` is doing the affordance work. The tracker writes tags plainly,
by decision, so it has nothing.

### Item 13 — the "+" is stretched, not sized

28.4 × 39.5px, aspect **0.72**. The width is intrinsic and correct: `--space-2xs`
padding ×2 + an 18.4px icon + 2px border = 28.4px. The height comes from
`.controls { align-items: stretch }` in `collection-toolbar.module.css`, whose
comment records *why*:

> `stretch`, not `center`: they come from three different components with three
> different contents … each sized itself to what it held, so the bordered ones
> ended up visibly different heights sitting side by side.

So the stretch was itself a fix, for a real problem, and it traded a height
mismatch for an aspect mismatch.

### Item 14 — the picker is undrawn

359 × 25px, and `border: none`, `background: rgba(0,0,0,0)`, `padding: 0`,
`border-radius: 0`. Only font and colour are inherited. Its stylesheet says the
native control is deliberate — a hand-rolled picker would have to reimplement
multi-select, keyboard operation and the platform dialog — and that only the box
around it is portably styleable. That remains true; the box is simply not styled.

### Item 3 — the spinner, and what was ruled out

The spinner is lucide's `LoaderCircle`, animated by
`animation: spin 1.2s linear infinite` with `transform: rotate(1turn)`.

**The obvious cause is not the cause.** Its art is a single path,
`M21 12a9 9 0 1 1-6.219-8.56` — an arc of the circle centred at (12, 12) with
radius 9, which is the centre of the 24×24 viewBox. Rotating about the element's
own centre is therefore the correct pivot, and the glyph is not orbiting because
it was drawn off-centre.

**What was measured:** the box is `1.15em`, which at the toolbar's 16px is
**18.4px** — confirmed on the running page, where the sibling `Check` icon under
the same rule measures 18.4 × 18.4. A fractional box puts the rotation centre at
9.2px, off the pixel grid, which is the standing candidate.

**What could not be measured.** A frozen-phase probe was built — two spinners,
18.4px and 24px, each on a fixed centre mark, with `animation-play-state: paused`
and a negative delay to pick the phase — but the available screenshot zoom tops
out at 2×, which cannot resolve a sub-pixel drift. The user can see the artifact
and the agent cannot, so the integer box ships as the one measured candidate and
**the user judges the result** (user-decided 2026-09-13). This is the same
division of labour that settled #17: the user's eye is the instrument.

## A note on how these were verified

Partway through the session the Chrome tab went `visibilityState: "hidden"`,
which stopped Zero syncing and left later screenshots stale or blank — the
already-recorded hazard about hidden tabs. Layout measurement is unaffected, and
every figure above came from `getComputedStyle`/`getBoundingClientRect` rather
than from a picture. The tag list was empty at the time, so item 16's comparison
used the **status** toggles; they are the same component in the same list, so the
conclusion is unchanged.
