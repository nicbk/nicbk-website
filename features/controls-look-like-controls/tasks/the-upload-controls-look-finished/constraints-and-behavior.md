# Constraints and Behavior: The Upload Controls Look Finished

Inherits [the feature's](../../constraints-and-behavior.md). Specific to doing
it:

## Squaring the "+" without unpicking the row

`.controls { align-items: stretch }` is a fix with a recorded reason: three
controls from three components each sized to their own contents and looked
ragged side by side. Two ways to square the "+", and they are not equivalent:

- **Give it an explicit equal width and height.** Simple, and it stops tracking
  the row. If the search field's height changes later, the "+" no longer follows.
- **Let it stretch and match its width to the resulting height.** Keeps the row
  coupled, but a width that depends on a computed height is not something CSS
  expresses without `aspect-ratio`.

`aspect-ratio: 1` with the stretch left alone is the version that keeps both
properties — the row still decides the height, and the button stays square at
whatever height that is. Prefer it, and if it does not hold, say why in the task
status rather than silently switching approach.

**Whatever is chosen, the row must still line up.** Measure the "+" , the status
indicator and the search field after the change, not just the "+".

## The file input stays a file input

- `type="file"` and `multiple` survive. A test pins them, because "style the
  picker" is one refactor away from "replace the picker".
- The control stays focusable and operable by keyboard, and still opens the
  platform dialog.
- Do not hide the real input behind a styled label unless the keyboard path is
  demonstrably unchanged — and if that is done, the demonstration belongs in the
  browser notes, not in a comment.
- The dotted boundary is a **visual** cue. This task does not implement
  drag-and-drop; a box that looks like a drop target and rejects drops would be
  worse than the bare input. If the dotted look implies a behaviour the control
  does not have, either give it the behaviour or choose a look that does not
  promise it.

## The spinner

- Pick a value that lands on whole pixels **at every font size the rule is used
  at**. `1.15em` is shared by `.icon`, `.iconFailed` and `.iconSpinning`, and the
  toolbar is 16px today — but a value that is integral only at 16px is a
  coincidence with a commit date. A `rem`-based or fixed value is the honest
  choice if `em` cannot be made integral where it is used.
- The `@media (prefers-reduced-motion: no-preference)` gate stays. Motion is
  opt-in project-wide.
- **Do not claim the wobble is fixed.** The PR and the status say a candidate was
  removed.

## Acceptance criteria

1. The "+" measures equal width and height.
2. The "+", the status indicator and the search field still agree in height.
3. The file field shows a dotted boundary and reads as a target; it is still
   `type="file"`, still `multiple`, still keyboard-operable, and still opens the
   platform dialog.
4. The dotted look does not promise a drop behaviour the control lacks.
5. The icon box measures a whole number of CSS pixels wherever the rule is used.
6. The reduced-motion gate is intact.
7. None of the above regresses at phone width or in dark theme.
