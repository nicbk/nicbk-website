# Status: Deletions Wait a Day

**State:** Merged ([#268](https://github.com/nicbk/nicbk-website/issues/268); PR [#273](https://github.com/nicbk/nicbk-website/pull/273)).

## What shipped

- **`PHYSICAL_DELETION_DELAY_SECONDS`** (24 hours) in
  `src/lit-tracker/jobs/queue.ts`. Its comment says why the bytes wait while
  the rows do not, and what the value must stay longer than.
- **`enqueuePdfCleanup`** (`src/zero/server-effects.ts`) sends with
  `startAfter` of the delay. It is still on the deleting transaction.
- **`queueAccountPurge`** (`src/lit-tracker/pdf/purge-stage.ts`) sends with the
  same delay. The `afterDelete` hook and the worker-start sweep both go through
  it, so both wait.
- **The comments** on the two queues and on the cleanup stage say "a day
  later".
- **#36's list** in `proposed-features.md` now includes disclosing the delay
  and the backups' one-year window. The deletion dialogs' "permanently deletes
  … cannot be undone" stays true, since there is no undo.

## Verified

- **Unit:**
  - the cleanup send carries `startAfter: 86400`;
  - the purge send carries it too, through both callers.
- **Integration**, `deletion-delay.integration.test.ts` against a real pg-boss:
  - a cleanup is stored due about 24 hours out, and `fetch` hands a worker
    nothing now;
  - two purge sends for one user make one delayed job.
- **Existing tests:**
  - the PDF, upload and jobs integration suites pass (51 tests). One sweep
    expectation was updated to the new options;
  - the full unit suite passes (2279 tests), at 95.39% lines, the same as
    `main`;
  - Biome and typecheck are clean.
- **Sandbox note:** Docker Hub rate-limited the sandbox (429), so the Postgres
  and Garage images were pulled from `mirror.gcr.io` and tagged locally. CI
  pulls as usual.
