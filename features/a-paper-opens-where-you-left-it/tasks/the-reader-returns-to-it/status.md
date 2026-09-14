# Status: The Reader Returns to It

**State:** In review. Safari check on `nicbk.com` after deploy still to do.

## Log

- 2026-09-14 — Spec'd.
- 2026-09-14 — **Found the spec's gap correction on the wrong side.** Measured
  against the DOM: `scrollToPage` is exact and the reported offset is
  `viewportGap / scale` too far down (research §4a). The correction moved to
  the reading, and #22's go-to stays as it is. Decided with the user; spec
  amended.
- 2026-09-14 — **Implemented.** `reading-position.ts` (read, restorable, moved)
  and `use-reading-position.ts`, mounted in the reader and fed from the article
  row; `setReadingPosition` added to the article mutations, silent on refusal.
  Mutation-checked: removing the restore gate, the gap correction, the
  `isInitial` check and the page-count bound each fails a test.

  Chrome, local, *Attention Is All You Need*:

  | check | result |
  |---|---|
  | open with nothing saved | p. 1, nothing written |
  | scroll into p. 9, wait | saved 372.918pt; DOM 372.93pt; `updated_at` unchanged |
  | reload ×3 | scrollTop 10302 each time; stored value unchanged |
  | 760px window (114.7% vs 151.6%) | p. 9, 373.03pt |
  | p. 3 / 100pt written to the row while open | arrived in the tab's Zero store; reader did not move |
  | reload after that | p. 3, 100.02pt |
  | scroll and reload within 150ms | flushed (p. 7, 584.69pt); reopened at 584.71pt, same scrollTop |
