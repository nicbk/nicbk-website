# Testing: Click Away

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

This is the most unit-testable task in the feature — it is a decision about
which handler runs, taken in this project's own code:

- **With a mark selected, a press on blank paper deselects and does not
  create.** The engine is mocked in the reader's suite already, so both halves
  are assertable: `deselectAnnotation` called, and the creation path not.
- **With nothing selected, a press on blank paper creates as before.** The
  guard must be conditional on there being a selection, not a blanket
  suppression — and this is the assertion that catches a fix which quietly
  breaks click-to-place.
- **Two presses in a row**: the first deselects, the second creates. The state
  does not stay swallowed.
- **A press on a mark, with another selected, is not swallowed** — selecting a
  second mark stays one click.
- **A press on the mark's own floating menu is not "clicking away."**
- The existing reader and selection-menu suites pass unchanged.

## Integration

Nothing new. No table, no mutator, no route.

## Browser verification (record in status.md)

- **The reported sequence**: pick a tool, draw a mark, click elsewhere. The mark
  deselects and no second mark appears.
- **Checked against the database, not only the paper.** A stray 100×100 mark can
  land under the toolbar, off the visible page, or exactly on top of another;
  "I do not see one" is not evidence. Count the article's rows before and after.
- **Click-to-place still works**: with nothing selected, one click puts a mark
  down.
- **Drag-to-create still works** with a mark selected — a drag is not a click.
- **Escape still deselects**, unchanged.
- Both themes; narrow / mid / wide.

## Coverage

Ratchet applies, and this task should comfortably clear it: the logic is a
predicate over "is anything selected", exercised through the reader's existing
mocked-engine suite.
