# Testing: Deselect Without Drawing

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Which press is spent, as pure logic**: mouse click with a mark selected and
  a tool live → spent; mouse drag → not spent; finger tap → spent; finger drag →
  not spent, and the mark stays; nothing selected → nothing spent, whatever the
  pointer did.
- **Where it is stopped**: at the press for a tool that creates on press, at the
  release for a tool that draws by dragging. Asserted as a decision over a tool
  id, not by driving a DOM.
- **The tool is told its pointer was cancelled** when a click is withheld from
  it — the half that makes the reported defect impossible rather than unlikely.
  Asserted by capturing what the guard dispatches.
- **Deselection happens once, and on the right event**: on press for a mouse, on
  release for a finger that did not move, and *not at all* for a finger that
  did.
- **Both thresholds are the ones intended**: the mouse's still agrees with the
  engine's click detector (task 3's pin), and the finger's is measured in screen
  pixels.
- The existing reader suite passes unchanged — especially task 3's and task 4's.

## Integration

Nothing new. No table, no mutator, no route.

## Browser verification (record in status.md — primary evidence)

The reported defect is a *sequence*, so each check is a sequence, and the
database is the arbiter of what was created.

- **The reported case**: with a tool live, draw a mark, click away, then move the
  mouse across the page. Nothing follows the cursor; the row count does not
  change; the mark is deselected.
- **A drag still creates**, on the very next press.
- **The sticky note**: with that tool live and a mark selected, clicking away
  deselects and leaves no note — counted, not looked at.
- **Touch, with a tool live**: press beside a selected mark and drag → the paper
  scrolls, the mark stays selected, nothing is drawn. Press and lift → the mark
  is put down. Then a drag draws again.
- **Task 4 is intact**: a hold beside a selected mark still selects a word, and a
  handle still drags.
- **Tasks 1 and 2 are intact**: pinch still zooms, and a thumb still scrolls with
  no tool live.
- Both themes; narrow / mid / wide.

## Coverage

Ratchet applies. The pure decision — which press is spent, and where — is what
carries it; the dispatch that cancels the tool is DOM work jsdom cannot run, so
it is asserted through what the guard is asked to dispatch rather than through
the plugin receiving it.
