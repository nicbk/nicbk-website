# Testing: Older Papers Are Read for Contents

The feature's integration rows for the backfill:
- queued exactly once;
- `updated_at` unchanged;
- metadata and references unchanged;
- a failure retried, then recorded.
