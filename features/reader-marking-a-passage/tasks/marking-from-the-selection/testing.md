# Testing: Marking From the Selection

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **What the control offers**: `copy` first, then the four text tools, each with
  an accessible name matching the toolbar's word for the same tool.
- **What choosing one does**: commits that tool through task 1's path, and
  leaves the selection spent.
- **What it offers when the document says no**: no markup actions without
  permission to modify annotations, `copy` disabled without permission to
  extract text — the two are independent and both are asserted.
- **Keyboard reachability**: every action focusable and activatable, asserted
  through the DOM rather than by inspection.
- **The target size**, read from the stylesheet, as
  `touch-selection/selection-handles.test.tsx` already does for the handles —
  jsdom applies no styles, and a touch target is an accessibility floor rather
  than a detail.
- The existing reader suite passes unchanged.

## Integration

Nothing new.

## Browser verification (record in status.md — primary evidence)

Against the Compose app, both themes, at 500px, mid and wide:

- **A touch selection is marked by tapping the action** — the reported defect —
  on one page and across a page break.
- **The mark matches a toolbar-made one**: same sidebar entry quoting the
  passage, same floating menu, and it is still there after a reload.
- **The control does not cover the passage it acts on** at 500px, with a
  selection spanning two lines and with one spanning a page break.
- **`copy` still copies**, and is still the obvious action.
- **The toolbar's own flow is untouched**: pick highlight, drag, mark; the tool
  stays live.
- Console clean; every mark **deleted by its recorded id**.

Touch is synthetic, stated plainly; a real thumb remains owed across #12 and
this feature alike.

## Coverage

Ratchet applies.
