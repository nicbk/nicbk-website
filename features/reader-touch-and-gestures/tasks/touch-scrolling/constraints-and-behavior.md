# Constraints and Behavior: Touch Scrolling

The subset of [the feature's criteria](../../constraints-and-behavior.md) this
task satisfies — the scrolling half of **"Scrolling and selecting by touch"**.
The selecting half moved to [`touch-selection`](../touch-selection/status.md)
when the model behind it was re-decided.

## Satisfied here

- One finger dragging the paper scrolls it, with no annotation tool active.
- A live drawing tool takes one-finger drags back; putting the tool down returns
  the drag to scrolling.
- Two fingers always pinch, under both of the above.
- Touch scrolling stops at the end of the reader's own scroll container rather
  than chaining into the page behind it — the decided overscroll rule, which is
  already declared on the viewport and must survive this change.

## Explicitly left to task 4

- **Selecting text by touch.** After this task a touch user can scroll, zoom and
  annotate but cannot select a passage — so the copy control, which #9 built,
  is unreachable by touch alone until task 4. Accepted with the user rather than
  discovered later.

## Must not regress

- **Task 1's pinch.** A criterion, not an assumption: the `touch-action` value
  chosen here decides whether the library still receives the two-finger gesture.
  Panning must be permitted **without** permitting the browser's own pinch-zoom,
  which means naming the pan axes rather than clearing the property.
- **Drawing by touch**, which works today only because every page carries
  `touch-action: none`. It must go on working while a tool is active.
- **Selecting text with a pointer.** Mouse and trackpad selection is untouched
  by this task and must be verified so, because the mechanism being changed sits
  underneath both.

## Constraints particular to this task

- **The lever is the interaction mode, not the stylesheet.** The interaction
  manager owns `touch-action` on every page element and rewrites it on each mode
  change; CSS that sets the same property is fighting a library that will win
  back at the next tool switch. What CSS may decide is the value the library
  *clears to* — those are different jobs and only one of them is ours.
- **Name the axes the reader actually scrolls.** The viewport scrolls vertically
  always and horizontally whenever a zoom makes a page wider than the panel
  (its stylesheet says exactly this, and declares `overscroll-behavior` on
  both). A value that permits only vertical panning would make a zoomed-in page
  unpannable sideways — a new defect introduced by the fix, and the one to watch
  for.
- **No hand-rolled scrolling.** Panning belongs to the browser: momentum, fling
  and rubber-band suppression are all things it does that JavaScript would have
  to re-implement, and the design system's overscroll decision is expressed
  declaratively on the assumption that native scrolling is what happens.

## Cross-cutting

- WCAG 2.2 AA: scrolling remains reachable by keyboard, and nothing here becomes
  touch-only.
- Both themes; narrow, mid and wide — narrow most of all, since that is where
  touch is used.
- No stored data, no schema change, no new mutator.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
