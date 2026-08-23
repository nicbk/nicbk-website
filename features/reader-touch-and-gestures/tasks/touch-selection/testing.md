# Testing: Touch Selection

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **The hold predicate**, directly and without a DOM: a press held past the
  threshold with no movement is a hold; one that moves past the movement
  threshold first is not, however long it lasts; one released early is not.
- **The word the hold selects**, given geometry and a point — `glyphAt` then
  `expandToWordBoundary`, asserted over a fixture rather than a live document,
  including the edges that bite: a point in the whitespace between words, a
  point past the end of a line, a point on a page with no text at all.
- **The hold does not arm while a tool is active.**
- **Handles render at the ends of a selection**, one per end, and carry a hit
  target larger than their graphic.
- **A dragged handle produces the range it should**, as a pure mapping from a
  point to a new range — the DOM drag is not testable here, the arithmetic is.
  Including the case that decides whether the mapping is right: dragging one
  handle *past* the other, where the ends swap and the anchor must stay put.
- **The magnifier's own arithmetic**: which part of the page it shows for a
  given boundary, and that it flips to below the touch point when there is no
  room above. What it paints is canvas work jsdom cannot run; where it points
  is arithmetic that must not be left to the browser pass alone.
- **Task 2's scrolling configuration is unchanged**: the mode still declines raw
  touch. This task must not quietly reclaim the gesture it deliberately gave up.
- The existing reader suite passes unchanged.

## Integration

Nothing new. No table, no mutator, no route.

## Browser verification (record in status.md — primary evidence)

**Real touch, preferably on a phone**, not only emulation — this task is more
sensitive to the difference than any before it, because the whole design turns
on what the browser does with a gesture and emulation arbitrates differently.

- **Long press selects the word under the finger**, and only that word.
- **A drag that is not a hold still scrolls** — including a slow one that nearly
  reaches the threshold, which is the case most likely to feel wrong.
- **Dragging a handle extends the selection and does not scroll the paper.**
- **Scrolling the paper does not move a handle.**
- **The magnifier shows the right place**, follows the boundary rather than
  lagging it, and is legible on a phone — the judgement it exists for, and the
  one no unit test makes.
- **The selection is ordinary from there**: the copy control appears over it and
  copies the right words; a highlight tool applied to it marks the right text;
  Escape drops it.
- **The browser's own selection UI does not also appear** — no callout, no
  context menu, no native handles beside ours.
- **A tool active suppresses the hold** and takes the drag for drawing.
- **Handles are usable**: reachable by thumb, and not covering the words they
  bound. Judged in use, on a phone, rather than by measurement.
- Both themes; narrow / mid / wide.

## Coverage

Ratchet applies. The gesture handlers are DOM code jsdom cannot exercise, so the
pure pieces — the hold predicate and the point-to-range mapping — carrying their
own tests is what keeps the ratchet honest.
