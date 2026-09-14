# Status: Pressable Things Look Pressable

**State:** Implemented, awaiting review. Task 1 of 2.

- Branch: `controls-look-like-controls/pressable-things-look-pressable`, from
  `main` at `f64399d` with the feature spec merged.
- Sub-issue: [**#162**](https://github.com/nicbk/nicbk-website/issues/162).
- PR: **TBD**.

## Why this task exists

In the collection's filter rail the group headings and the filters under them are
the same thing to look at — `rgb(89, 89, 89)`, 14px, weight 400, both of them.
"tags" and "read" even measure the same 33.6px wide. A reader cannot tell which
words do something.

## What shipped

One declaration: `.toggle`'s resting `color` becomes `var(--color-text)`. The
headings are untouched — they were always right, they simply had nothing to
contrast with.

The stylesheet's two comments carry the *why*: that the direction was forced by
the contrast floor rather than chosen, and that the pressed state's bold stopped
being belt-and-braces the moment resting rose.

## What the browser measured

Chrome, local Compose stack, both surfaces, both themes. The selected look was
probed by setting the `data-pressed` attribute the stylesheet keys off — whether
React sets it is what the existing tests cover; what is being verified here is
the three states' *appearance*.

### The blog's tag filter

| | heading | resting | pressed |
|---|---|---|---|
| light | `rgb(89,89,89)` | `rgb(31,31,31)` | `rgb(11,87,208)` + **700** |
| dark | `rgb(176,176,176)` | `rgb(236,236,236)` | `rgb(138,180,248)` + **700** |

### The tracker's filter rail

Identical values in both themes — which is the point of the control being
shared. Visually the rail now reads as two grey labels over near-black controls.

### Hover

Landing a real pointer on a resting toggle turns it `rgb(11,87,208)`, the accent,
still inside `@media (hover: hover)`.

## Before and after, in one line

Heading and resting toggle were `rgb(89,89,89)` and `rgb(89,89,89)`. They are now
`rgb(89,89,89)` and `rgb(31,31,31)`.

## What is not verified, and why

- **The narrow-screen filters drawer.** Opening it needs a click, and the Chrome
  tab reports `visibilityState: "hidden"` — the page never hydrates, so React
  does not respond (a real click produced the CSS hover state and no state
  change, which is the signature). The drawer renders **the same `FilterGroups`
  component over the same stylesheet** — "one list, two containers" is a decided
  property with its own tests — so the hierarchy follows by construction rather
  than by measurement. Worth a glance next time a foreground session is running.
- **The axe scans.** They live in the Playwright suites, which are deferred
  project-wide and skipped in CI. `src/styles/contrast.test.ts` does run, and it
  already audits `--color-text` at 4.5:1 against every surface in both themes —
  which is exactly the token the resting state moved to.

## A neighbour worth not "fixing"

`.editToggle` in the rail — the glyph that turns tag removal on — is deliberately
`--color-text-muted`, so the resting rail shows one quiet control rather than a
button competing with the tags. Raising the tags made it *relatively* quieter,
which is the direction its own comment asks for. It stays as it is.

## Log

- 2026-09-13 — Implemented. 1618 unit tests pass (1612 + 6). The new test was
  checked by reverting the one-line change and confirming it fails.
- 2026-09-13 — Spec'd.
