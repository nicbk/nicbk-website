# Testing: Annotations Sidebar

What this task's tests must cover. The feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

**The tab**

- A **third tab** exists, named for annotations, and the tab interface's
  keyboard model still works with three tabs.
- **No Citations tab exists** — the assertion carried from task 1, now with one
  more tab beside it to make sure the count is right for the right reason.
- **Selecting the tab does not unmount or replace the reader.** The specific
  behavioral contrast the decided spec draws, and the one most likely to be
  broken by #10's change right next door.

**The list**

- Renders a row per annotation, with the snippet and the page number.
- A row for an annotation with **empty `contents`** renders an identifiable
  fallback rather than a blank line — asserted for an ink and a shape
  annotation, the two types that produce it naturally.
- A **long snippet** is bounded rather than allowed to grow the sidebar. Design
  for the content that will really be there: a highlight can be a paragraph.
- **Empty and syncing are distinct states**, and neither is rendered as the
  other.
- The list is a list to assistive technology and each row is **keyboard
  activatable**.

**Jump to page**

- Activating a row calls the reader's page navigation with the row's
  `page_index` — asserted against the injected navigation surface.
- **Keyboard activation does the same thing as a click.**
- A row whose `page_index` is out of range for the loaded document does not
  throw.

**Liveness**

- A row appearing in the synced data renders without any refresh action; a row
  disappearing removes it. Both directions asserted, since a list that only ever
  grows is a real and easy defect.

## Integration

Nothing new. This task adds no table, no mutator, and no route; task 4's
integration coverage stands behind the rows this list reads.

## Browser verification (record in status.md)

- Make several marks across different pages of a real paper, open the tab, and
  see them all.
- **Click a row and land on the right page**, confirmed against the reader's own
  page indicator.
- Make a new mark with the tab open and watch the row appear; delete one and
  watch it go.
- An ink stroke's row reads as something, not as an empty line.
- Both themes, at narrow, mid, and wide widths — **including inside the drawer**
  below the breakpoint, where a long list and a document compete for one screen.

## Coverage

Ratchet applies. This is a list component and a page-jump call; it should raise
coverage rather than lower it.
