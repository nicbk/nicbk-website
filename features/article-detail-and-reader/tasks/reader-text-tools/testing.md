# Testing: Reader Text Tools

What this task's tests must cover, at the level its spec is decided. The
feature-wide tiers are in [../../testing.md](../../testing.md); the detailed
unit list is written once the task's open UI decisions are settled.

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Copy** hands the selection's text to the clipboard surface, and nothing
  else changes: selection intact, tool intact, selected mark intact.
- **Text on a mark** round-trips through the sync bridge: setting it produces
  one committed update carrying `contents`, clearing it produces one, and an
  incoming remote `contents` change lands on the mark without an echo — the
  fingerprint already covers `contents`, so the existing echo tests extend
  rather than duplicate.
- **Capture at creation**: a text-markup annotation's create carries the
  selected text as `contents`.
- **The translucent rectangle** is offered as its own tool and creates an
  annotation whose payload states its translucency.
- Whatever editor surface is chosen: keyboard operable, labelled, and it must
  not let a synced update overwrite text mid-edit — the decided editing rule in
  `design-system.md`.

## Integration

Expected: nothing new. No new table, no new mutator; task 4's integration
coverage stands behind the writes. If implementation adds a mutator after all,
it gets the same ownership-refusal coverage as the existing three.

## Browser verification (record in status.md)

- Select text, copy it, paste it somewhere real — the words match the paper.
- Write on a highlight; see the text in the sidebar row, in a second window,
  and after a reload. Edit it; delete it.
- Draw a translucent rectangle over a figure; the figure stays readable, in
  both themes.
- Watch `updated_at` on an untouched row while typing in another mark's editor
  — the write-per-keystroke storm is this task's likeliest defect, and idle
  rows state it plainly.
- Both themes, narrow / mid / wide.

## Coverage

Ratchet applies.
