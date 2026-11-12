# Testing: Deletions Wait a Day

- **Unit:**
  - both sends carry `startAfter` equal to the constant;
  - the purge still refuses a user who exists.
- **Integration (pg-boss on Testcontainers Postgres):**
  - a queued cleanup's `start_after` is about 24 hours ahead, and no worker
    picks it up early;
  - a second purge send for the same user while one is delayed adds no job.
- **The ratchet** must not fall.
