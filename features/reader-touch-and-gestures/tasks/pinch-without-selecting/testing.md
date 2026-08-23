# Testing: Pinch Without Selecting

What this task's tests must cover, within
[#12's testing requirements](../../testing.md) — where the browser pass is
primary evidence and the unit tier holds decisions rather than gestures.

## Unit (Vitest + jsdom)

- **The decision, as a pure function.** Whatever "this press belongs to a pinch"
  is decomposed into is tested without a DOM: one finger down is not a pinch,
  two is, and it stays one until the last finger lifts — including the case
  where the fingers lift in the order they landed and the case where they do
  not.
- **What is withheld and what is not.** Presses and moves are withheld for the
  length of the gesture; **lifts are let through**, which is the assertion that
  documents why — the text handler's only reset. Written as a claim about the
  library's contract, with the reason in the test, since a future reader will
  otherwise "simplify" it.
- **The live tool is told its pointer was cancelled**, once, aimed at the
  element the press landed on. Task 6 shipped that machinery for a different
  reason; if this task reuses it, the reuse is asserted rather than assumed.
- **A selection that existed before the gesture is restored**, and one that did
  not is not invented.
- **One finger is unaffected**: the hold still arms, the moves are still
  withheld by task 4's guard, the tap still deselects. Regression assertions on
  the existing suites, not new copies of them.

**Not asserted:** that the paper zooms. That is the library's, verified in the
browser.

## Integration

Nothing new. No table, no mutator, no route.

## Browser verification (record in `status.md`)

Primary evidence, and this task's subject is a two-finger gesture — so the
status must say plainly **how the second finger was produced**: real touch,
Chrome's touch emulation, or dispatched `PointerEvent`s plus the `TouchEvent`s
the zoom wrapper listens for. Emulation and glass do not always agree, and a
synthetic pinch cannot prove the browser's part.

Per the table in
[constraints-and-behavior.md](./constraints-and-behavior.md), at minimum:

- **Pinch with nothing selected and no tool live** — the zoom percentage moves;
  the selection stays empty; no copy control appears.
- **Pinch with a passage selected** — the zoom moves and the selection is the
  same passage afterwards, character for character.
- **Pinch with a tool live** — the zoom moves; the database row count does not,
  and nothing is drawn or previewed mid-gesture (counted as elements inside the
  page, the way task 6 counted a half-made shape).
- **Pinch with a mark selected** — the mark is still selected afterwards.
- **The press after the pinch** — a mouse move across the page draws no
  selection; a press then a drag behaves normally. This is the stranded-state
  check, and it is the one most likely to fail.
- **Tasks 1, 2, 4 and 6 intact** — ctrl+wheel zoom, one-finger `touch-action`,
  the hold that selects a word, and the click that deselects without creating.
- Both themes; narrow and wide.
- Every test mark removed afterwards **by the ids recorded when they were
  made** — never by a time window; the user is using the app while this is
  verified.

## Coverage

Ratchet applies. As with tasks 4 and 6, the way to satisfy it honestly is the
decomposition the unit tier asks for: the multi-touch decision as a pure
function, separate from the handler that acts on it.
