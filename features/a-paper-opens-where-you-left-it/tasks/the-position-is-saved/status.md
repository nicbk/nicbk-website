# Status: The Position Is Saved

**State:** Complete — merged in #198.

## Log

- 2026-09-14 — Spec'd.
- 2026-09-14 — **Implemented.** `reading_page` (integer) and `reading_offset`
  (double precision) on `articles`, migration `0005_reading_position`, Zero
  schema regenerated, `articles.setReadingPosition` modelled on `setStatus`.
  Unit tests assert the write carries exactly `id`, `readingPage` and
  `readingOffset`; integration tests round-trip a fractional offset, check
  `updated_at` is unchanged, and refuse another user and an anonymous caller.
  Mutation-checked: removing `requireOwnedArticle` fails one unit and one
  integration test; adding an `updatedAt` write fails one of each. Applied to
  the local database with zero-cache running: it took both columns as a live
  `add-column` ("Schema updated"), no resync — the publication is per table,
  so it needed no change.
