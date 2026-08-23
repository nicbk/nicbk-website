# Testing: Touch Scrolling

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **The mode registration**: the mode active when no tool is chosen declines raw
  touch, and a tool's own mode does not. That split is the whole task, it is a
  value in an object, and it would break silently.
- **The reader registers it at all** — the effect that hands the mode to the
  interaction manager runs, and runs once rather than on every render.
- **Task 1's gesture wrapper is still mounted with both gestures enabled.**
  Asserted here deliberately: this is the task that could undo it.
- **The existing reader suite passes unchanged**: Escape, the jump, the toolbar,
  the copy path, the sync bridge.

Not asserted here, and said plainly so nobody adds a test that lies: that a drag
scrolls, that a tool's drag draws, or that two fingers zoom. jsdom has no touch,
no layout and no compositor, and `touch-action` has no observable behaviour in
it — a passing "touch scrolls" test in this tier would be asserting a mock.

## Integration

Nothing new. No table, no mutator, no route.

## Browser verification (record in status.md — primary evidence)

**Real touch or Chrome's touch emulation with genuine `TouchEvent` dispatch**,
and the status must say which — emulation and glass disagree about exactly the
things this task changes.

- **One finger scrolls** the paper with no tool active. The reported defect,
  checked first.
- **The scroll stops at the panel's end** rather than moving the page behind it.
- **A zoomed-in page pans sideways.** The failure mode of naming too few axes,
  and invisible unless the paper is zoomed past the panel's width first.
- **A tool active returns the drag to drawing**, and putting the tool down
  returns it to scrolling — both directions, since a mode change that only works
  once is the likely failure.
- **Two-finger pinch still zooms.** Task 1's behaviour, re-verified here.
- **`touch-action` is what it should be, per state.** Read the computed value
  off a page element with no tool and with one, since it is the mechanism and
  everything above is downstream of it.
- **The pointer path is unchanged**: mouse selection, drawing and clicking on
  the same build.
- Both themes; narrow / mid / wide.

## Coverage

Ratchet applies. This task is a small amount of configuration, so its own
contribution is small; the honest way to hold the ratchet is to test the mode
decision thoroughly rather than to manufacture tests for `touch-action`.
