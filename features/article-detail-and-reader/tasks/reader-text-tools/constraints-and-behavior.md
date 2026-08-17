# Constraints and Behavior: Reader Text Tools

This task was added after the feature's acceptance criteria were written, so
its criteria live here rather than as a subset of
[the feature's](../../constraints-and-behavior.md). The capability list below
was decided with the user (2026-08-16); the UI shapes are deliberately **not
decided yet** — they are this task's open items, to be settled with the user
before writing, together with the `research/` revisions that record them.

## Copy selected text

- A reader who has selected text in the document can copy it, by an affordance
  reachable with the selection active and by the platform's own copy shortcut
  if the selection model allows it.
- Copying does not disturb the selection, the active tool, or any selected
  mark.

## Text on a mark

- A mark can carry the reader's own text, stored in the annotation row's
  existing `contents` column and synced like any other annotation change.
- The text is editable and removable after the fact, from the mark itself in
  the reader.
- A text-markup annotation (highlight, underline, strikeout, squiggly) captures
  **the text it was drawn over** into `contents` at creation, so the sidebar's
  rows quote the paper rather than naming the tool.
- Task 5's sidebar picks the text up with no changes of its own: rows with
  `contents` already show it.

## Translucent rectangle

- A rectangle tool whose fill leaves the paper readable through it, distinct
  from the opaque-stroke rectangle task 4 shipped.
- It can carry text like any other mark.
- Where it appears in the tool menu, and its name, are wording decisions to
  settle at implementation.

## Explicitly not in this task

- No comment threads or replies. One mark, one text.
- No colour picker.
- No new tables; no new mutators unless implementation proves one necessary,
  which is a finding to raise first.

## Cross-cutting

- WCAG 2.2 AA: whatever surface edits a mark's text is fully keyboard
  operable, labelled, and correct in both themes.
- Correct at narrow, mid, and wide widths.
- Only committed annotation changes are persisted, exactly as task 4's bridge
  already enforces — a keystroke-per-row write storm through the sync engine is
  the failure mode to design against.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
