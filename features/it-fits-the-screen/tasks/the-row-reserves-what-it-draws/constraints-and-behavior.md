# Constraints and Behavior: The Row Reserves What It Draws

The feature's **row's width** constraints, plus:

- **The drawn result does not change.** The **+** is square, the height of the
  row, in both engines. What changes is only what it reports to layout.
- **Measured, not eyeballed**: the overrun is a number
  (`scrollWidth - clientWidth` on the row and on its control cluster), and the
  number is 0 at 320, 375, 500 and 1400.
- The panel's `overflow` and `overscroll-behavior` are **not touched**.
- Whatever replaces the intrinsic width keeps the two results the square button
  already carries: it is square because a ragged row was a reported defect, and
  it states `height: 100%` because Safari would not feed a stretched height
  through `aspect-ratio`.

## Acceptance

Feature criteria 3 and 4.
