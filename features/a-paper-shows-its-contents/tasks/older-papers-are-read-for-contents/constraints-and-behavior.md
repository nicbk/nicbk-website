# Constraints and Behavior: Older Papers Are Read for Contents

The feature's "Older papers" behavior, plus:

- **Queued once per paper**, keyed by the article, `exclusive`, safe to call on
  every worker start: a paper with a row is never re-queued.
- **Its own queue and dead-letter queue**, named beside the reference re-read's
  in `jobs/queue.ts`.
- **Memory measured first.** The largest paper in the collection is read through
  the stage, and its peak RSS is recorded in this task's status before the
  backfill is enabled.

## Acceptance

The feature's criterion 4.
