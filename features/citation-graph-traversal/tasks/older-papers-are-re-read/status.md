# Status: Older Papers Are Re-read

**State:** In review ([#207](https://github.com/nicbk/nicbk-website/issues/207)).

## What shipped

- **`reference_reads`** (migration `0007_reference_reads`): one row per paper
  being re-read, `queued | done | failed`, synced and owner-scoped
  (`queries.referenceReads.mine`). Done rows stay until the batch has none
  queued or failed, then all go.
- **`citations/reread-stage.ts`**:
  - `queueReferenceRereads` runs on worker start, outside the connection retry
    loop.
  - `runReferenceReread` makes every network call (GROBID, then Semantic
    Scholar) before any write, then replaces the bibliography in one
    transaction.
  - It writes only `reference_count` and `references_read_at` to the article,
    and `updated_at` is left alone.
- **Queue** `lit-tracker.reread-references`, with extraction's retry policy, a
  dead letter that marks the row failed, and `exclusive` per paper.
- **Try again**: `referenceReads.retry` (owner-checked, failed → queued) plus a
  server effect that sends a job for each named paper that is now queued, on the
  mutation's transaction.
- **Upload status indicator**:
  - one summary row, "re-reading references · N of M papers";
  - a warning row, "couldn't re-read references for N papers · their old
    references are kept", with **try again** and no dismiss;
  - labels that don't call a re-read an upload.

## Found while verifying

- **A row could wait forever.** On the local stack the queue already existed
  from before its policy was set, and the rows then queued had no job. So every
  start now sends a job for every `queued` row; the paper-keyed `exclusive`
  policy keeps a still-waiting paper to one. Covered by an integration test
  that deletes the jobs.
- **pg-boss refuses `policy` in `updateQueue`**, even unchanged, so the policy
  is set only at creation.

## Verified

Chrome, local stack, five real papers. Semantic Scholar was rate-limiting this
machine throughout, so retries were real.

| check | result |
|---|---|
| worker start | "Re-reading references for 5 older papers"; five rows queued |
| indicator while queued | "Re-reading references" |
| a batch finishing | the row cleared; indicator back to "All articles synced" |
| forced failure | warning row, one control (try again), no dismiss |
| real click on try again | row queued, job sent, popup stayed open on "0 of 1 paper", then succeeded through 429 retries and cleared to the checkmark |

Results after the re-read:

| paper | count | rows | printed |
|---|---|---|---|
| Attention (A) | 41 | 40 | 39 |
| BERT | 63 | 61 | 54 |
| ConvS2S | 51 | 51 | 44 |
| Layer Normalization | 33 | 32 | 31 |
| Attention (B) | 41 | 40 | 39 |

Also:

- `updated_at` is unchanged on every paper, still in August.
- No merged "handbook" rows remain.

**Tests.**

- Unit: stage, queue, mutator, effect (its query rendered as SQL), status state,
  list rows, hook.
- Integration: queueing once, lost-job re-send, editable fields unchanged, batch
  counting, GROBID failure, Semantic Scholar away, exhaustion, retry ownership,
  query isolation, publication.

**Mutation checks.** Each of these breaks fails a test:

- `updated_at` stamped
- title written
- an unreadable paper retried
- already-read papers queued
- a batch cleared early
- retry ignoring owner
- retry re-queuing any status
- the effect ignoring owner

## Log

- 2026-09-14 — Split from `the-references-can-be-trusted`, with how it starts
  and shows itself decided with the user.
- 2026-09-14 — Implemented and verified on the local stack.
