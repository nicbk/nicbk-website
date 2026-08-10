# Constraints and Behavior: Annotations Sidebar

The subset of
[the feature's acceptance criteria](../../constraints-and-behavior.md) this task
satisfies.

## The tab

- A **third tab** in the detail page's sidebar, beside Tags and Notes.
- **Citations is still not rendered** — not empty, not disabled. #10 adds it.
- **Selecting this tab does not swap the main content area.** The reader stays
  mounted and stays showing the document. This is the decided contrast with the
  Citations tab, per
  [reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)
  and
  [article-detail.md](../../../../research/ui-ux/pages/lit-tracker/pages/article-detail.md).
- The tab carries a discernible accessible name and participates in the existing
  tab interface's keyboard model.

## The list

- Lists **this article's annotations**, read from the synced rows task 4 added —
  no fetch.
- Each row shows a **content snippet** and a **page number**.
- A row for an annotation with **empty `contents`** — expected for ink strokes
  and shapes — still reads as something identifiable rather than as a blank
  line. The schema doc explicitly leaves this fallback to the UI; this is where
  it is decided.
- The list is **live**: a mark created in the reader appears without a refresh,
  and a deleted one disappears. Both directions, because a stale list is worse
  than no list.
- The list is a **list to assistive technology**, and each row is reachable and
  activatable **by keyboard**, not by pointer alone.
- An article with **no annotations** says so, distinctly from a list still
  syncing.

## Jump to page

- **Activating a row moves the reader to that annotation's page**, reading
  `page_index` from the row.
- Activation works by **click and by keyboard**.
- The reader's **page indicator agrees** afterwards — the jump moves the
  document, not just the scroll position of something else.

## Explicitly not in this task

- **No editing or deleting from the list.** The mark is editable in the reader.
- **No filtering, sorting, or grouping.**
- **No Citations tab.**
- **No schema or mutator changes.** A gap in what the rows carry is a finding to
  raise, not a migration to add here.

## Cross-cutting

- WCAG 2.2 AA: contrast in both themes, visible focus on every row, keyboard
  operation throughout.
- Correct in both themes and at narrow, mid, and wide widths — including inside
  the drawer the sidebar becomes below the breakpoint, where a long list and a
  document are competing for the same screen.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
