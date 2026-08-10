# Task: Annotations Sidebar

**Fifth of five.** The way back to a mark.

Task 4 made annotations exist and persist. This task makes them **findable**:
the sidebar's third tab, listing this article's marks with a snippet and a page
number, and a click that moves the reader to the page the mark lives on.

It is a small task, and it is separate for one reason — task 4 carries a new
synced table, new mutators, and a new authorization surface, and a list UI has
no business sharing that review.

## What it does

- **The Annotations tab**, third in the sidebar this feature has been building.
  (Citations is #10's, and is still not rendered.)
- **A list of this article's annotations**, one row each, showing a **content
  snippet and a page number** — reading from the synced rows task 4 added, so
  the list is live: a mark made in the reader appears without a refresh, and one
  deleted disappears.
- **A sensible row for a mark with no text.** Ink strokes and shapes have empty
  `contents` by nature; the schema doc says the fallback is a UI concern, and
  this is that UI. A row that reads as blank is a row that looks like a bug.
- **Click a row, the reader jumps to that page.** The reason `page_index` is a
  real column rather than a field inside `payload`.
- **The tab does not swap the main content.** The reader stays exactly where it
  is. This is the explicit contrast the decided spec draws with the Citations
  tab, whose whole behavior is to swap it — and it is the kind of distinction
  that quietly erodes when #10 adds the tab that does.

## What it does not do

- **No editing from the list.** Selecting a row navigates; it does not open an
  editor. Nothing decided specifies one, and the mark itself is editable in the
  reader where it lives.
- **No filtering, sorting, or grouping** of the list. Not specified, and a
  control with no decision behind it is a decision taken silently.
- **No Citations tab.** #10.
- **No changes to the annotation schema or its mutators.** If the list needs
  something the rows do not carry, that is a finding to raise, not a migration
  to slip in here.

## Exit state

The full decided article detail page, minus the citation graph: a paper open in
the reader, its tags and notes and marks in the sidebar beside it, and every
mark one click from the page it belongs to.
