# Testing: Touch Scrolling

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **The hold predicate**, directly and without a DOM: a press held past the
  threshold with no movement is a hold; one that moves past the movement
  threshold first is not, however long it lasts; one released early is not. This
  is the piece the constraints require be decomposed out, and it is the only
  part of the gesture that is genuinely unit-testable.
- **The mode registration**: the mode used when no tool is active declines raw
  touch, and a tool's own mode does not. The whole model rests on that split, it
  is a value in an object, and it would break silently.
- **The reader still mounts task 1's gesture wrapper with both gestures
  enabled** — asserted here too, deliberately, because this task is the one that
  could undo it.
- **The existing reader suite passes unchanged**: Escape, the jump, the toolbar,
  the copy path, the sync bridge.

Not asserted here, and stated so nobody adds a test that lies: that a drag
scrolls, that a hold selects text, or that two fingers zoom. jsdom has no touch,
no layout and no compositor; a passing "touch scrolls" test in this tier would
be asserting a mock.

## Integration

Nothing new. No table, no mutator, no route.

## Browser verification (record in status.md — primary evidence)

**This task is the reason the feature's testing plan makes touch mandatory.**
Real touch hardware or Chrome's touch emulation with genuine `TouchEvent`
dispatch; the status must say which, since emulation and glass disagree about
exactly the things this task changes.

- **One finger scrolls** the paper, with no tool active — the reported defect,
  checked first.
- **The scroll stops at the panel's end** rather than moving the page behind it.
- **Long press then drag selects**, and the copy control appears over the
  selection; copying yields the words on the paper.
- **A short drag does not select** — it scrolls, every time, including a slow
  one that nearly reaches the hold threshold.
- **A tool active returns the drag to drawing**, and putting the tool down
  returns it to scrolling; both directions, since a mode change that only works
  once is the likely failure.
- **Two-finger pinch still zooms** — task 1's behaviour, re-verified here
  because this task can undo it.
- **The pointer path is unchanged**: mouse selection, drawing and clicking
  behave as before on the same build.
- Both themes; narrow / mid / wide, with narrow given the most attention.

## Coverage

Ratchet applies. Most of this task's code is DOM handlers that jsdom cannot
exercise, so the pure hold predicate carrying its own tests is what keeps the
ratchet satisfiable honestly — the alternative, mocking touch and asserting the
mock, would raise coverage while testing nothing.
