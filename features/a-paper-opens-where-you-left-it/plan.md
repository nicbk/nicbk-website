# Plan: A Paper Opens Where You Left It

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`the-position-is-saved`](./tasks/the-position-is-saved/description.md) | [#195](https://github.com/nicbk/nicbk-website/issues/195) | Columns, migration, Zero schema, `articles.setReadingPosition` |
| 2 | [`the-reader-returns-to-it`](./tasks/the-reader-returns-to-it/description.md) | [#196](https://github.com/nicbk/nicbk-website/issues/196) | Restore on open; save while reading, with the gap-corrected offset |

Task 1 first: the reader has nothing to write to without it, and a schema change
is its own review.

## Risks

- **Every open overwrites the position with page 1.** The reader's own initial
  scroll reports through `onScroll`. Saving is gated on the restore; a unit test
  fires a scroll before layout-ready and asserts no write.
- **Drift.** Measured at ~7pt per open without the gap correction; the round
  trip gets a test, and the browser check reloads several times.
- **Write volume.** Scrolling fires continuously; the save is debounced and
  skips sub-line changes.
- **Leaving before the debounce fires.** Flushed on `pagehide` and hidden
  visibility — the events a phone gives when switching apps.

## Dependencies

#9 (reader), #8 (article model and mutators). #22's go-to was measured exact and is not changed (research §4a).
