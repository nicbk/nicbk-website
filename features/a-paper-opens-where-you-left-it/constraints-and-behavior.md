# Constraints and Behavior: A Paper Opens Where You Left It

## Behavior

- As a reader scrolls, the **top visible page and its offset** are saved to the
  article, at most about once a second while scrolling, and once more when the
  reader leaves (navigating away, closing the tab, switching apps).
- Opening an article with a saved position **starts there**, instantly — no
  visible scroll from page 1.
- Opening one with none starts at page 1, as today.
- An open reader is **never moved** by a position saved elsewhere.
- Jumps a reader makes — the page field, an annotation, a citation's "go to" —
  are reading like any other, and save.

## Constraints

### Stored

- Two nullable columns on `articles`: `reading_page` (integer, 1-based, as the
  scroller counts) and `reading_offset` (double precision, page points from the
  top of that page). Both null means no position.
- Written only by `articles.setReadingPosition`, which takes the owner from the
  session, checks ownership, and validates: `page` an integer ≥ 1, `offset`
  finite and ≥ 0, both bounded to refuse nonsense.
- **Does not touch `updated_at`.**

### Restored

- On the scroll capability's `onLayoutReady` for this document with
  `isInitial: true`, once.
- Through one helper that scrolls to a page point **correcting for the
  viewport gap** (`y − viewportGap / scale`). #22's "go to" uses the same helper.
- A saved page beyond the paper's page count is ignored, not clamped to the
  last page.

### Saved

- From `onScroll` metrics: the top visible page's `pageNumber` and
  `original.pageY`.
- **Only after the restore has run** (or been skipped for having nothing to
  restore).
- Debounced; not written when the value has not moved by more than a line's
  height; flushed on `pagehide`, on `visibilitychange` to hidden, and on unmount.
- Synced values arriving while the reader is open are ignored.

## Acceptance criteria

1. The mutator: the owner can set a position; another user and an anonymous
   caller cannot; invalid values are refused; `updated_at` is unchanged.
2. Read to a spot, reload: the same page, offset within a line.
3. Repeated reloads without scrolling do not drift.
4. At a different window width (a different FitWidth zoom): the same paragraph
   is at the top.
5. Opening the paper with no saved position starts at page 1.
6. A second window reading elsewhere does not move an open reader; opening the
   paper afterwards starts at the second window's position.
7. #22's "go to p. N" lands the entry at the intended distance below the toolbar,
   with the gap corrected.
8. Chrome and Safari.
