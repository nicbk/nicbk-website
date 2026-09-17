# Constraints and Behavior: A Menu Stays on Screen

The feature's Behavior and its **edge rule** constraints, plus:

- **One pure function**, beside `menuPlacement` and shaped like it: the anchor,
  the menu's width, the viewport — and an offset, in pixels, to apply. No React,
  no engine, no reading of where the menu currently is (the same stability
  argument the vertical rule makes: a rule phrased "it overlaps now" flips back
  the moment moving stops the overlap).
- **Zero when it already fits.** A menu that does not reach an edge is not
  moved by a pixel, so nothing about a mark in the middle of a page changes.
- The three surfaces — a mark's controls, a selection's bar, the note editor —
  all take it, because all three hang from the same kind of box.
- The inset is the one the guarded surfaces use, so the two families line up.

## Acceptance

Feature criteria 1, 2 and 6.
