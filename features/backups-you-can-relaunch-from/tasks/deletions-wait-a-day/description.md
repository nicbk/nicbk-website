# Task: Deletions Wait a Day

Task 1 of 5 of [#32](../../description.md). Sub-issue
[#268](https://github.com/nicbk/nicbk-website/issues/268).

A deleted paper's PDF, and a deleted account's folder, stay in Garage for 24
hours before they are erased (BK9). Without the wait, a paper deleted between
a checkpoint's dump and its copy would be restored as a paper whose PDF is
missing.

## Changes

- **`src/lit-tracker/jobs/queue.ts`**: one exported constant,
  `PHYSICAL_DELETION_DELAY_SECONDS = 24 * 60 * 60`. Its comment says why it
  exists: the backup's order (dump, then copy) and BK9. It also says the delay
  must stay longer than a run's dump-to-copy time, which is minutes.
- **`src/zero/server-effects.ts`**: `enqueuePdfCleanup` sends with `startAfter`
  of the delay. It is still inside the deleting transaction.
- **`src/lit-tracker/pdf/purge-stage.ts`**: `queueAccountPurge` sends with the
  same delay. That covers both the `afterDelete` hook and the worker-start
  sweep. The exclusive queue's `singletonKey` already makes the sweep's send a
  no-op while a delayed purge is queued; a test confirms it.
- **The comments** in `cleanup-stage.ts` and `purge-stage.ts` that say "at
  once", or imply it, are updated.
- **The spec docs** for #32 ride along.

## Not in this task

- Disclosing the delay in the Privacy Policy. That is #36, and a line is added
  to that feature's list when it is spec'd.
