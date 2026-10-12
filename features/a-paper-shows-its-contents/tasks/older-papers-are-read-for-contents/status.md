# Status: Older Papers Are Read for Contents

**State:** Merged ([#246](https://github.com/nicbk/nicbk-website/issues/246); PR [#253](https://github.com/nicbk/nicbk-website/pull/253)).

## What shipped

- **`src/lit-tracker/contents/read-stage.ts`**, on the reference re-read's
  pattern (`citations/reread-stage.ts`) with one thing fewer: **no status
  table.** A paper needs reading exactly when it has no `article_contents` row,
  and every outcome writes one, so the row's absence is the queue's whole state.
  - `queueContentsReads`: every article with `extraction_status` of
    `grobid_only` or `enriched`, no contents row and no upload job left, is sent
    one job keyed by the article. A paper still uploading is left to its upload,
    which reads its contents anyway.
  - `runContentsRead`: fetch the stored PDF through the ownership-checked path,
    read its outline with the server's engine, and ask GROBID for headings
    **only if there is no usable outline**. A GROBID that is down throws and the
    job is retried; one that refuses the paper leaves it with what the outline
    gave. An unreadable outline with no headings either is written `failed`.
  - `runExhaustedContentsRead`: retries spent, the row says `failed`, so the
    tab can say so and the next start does not ask again.
  - The row is written with `on conflict do nothing`: an upload that read the
    paper while the job waited wrote something at least as current.
- **`jobs/queue.ts`**: `lit-tracker.read-contents` (`exclusive`, five retries
  backing off from 30 s) and its dead letter `lit-tracker.read-contents-exhausted`.
- **`jobs/worker.ts`**: the handlers are registered, and the backfill is queued
  at every start after the reference re-read's, logging how many papers it sent.

## Verification

- Unit tests (`read-stage.test.ts`, `worker.test.ts`): the order of reads, when
  GROBID is and is not asked, each failure's outcome, the handlers' bindings.
- Integration, against Testcontainers Postgres, Garage and real pg-boss
  (`extraction.integration.test.ts`, "reading the contents of an older paper"):
  - queued exactly once, and a second start sends no second job;
  - a paper still uploading, one that failed extraction, and one with its row
    are not queued;
  - the real engine reads the fixture's outline from Garage with no GROBID call;
  - the article row, `updated_at` included, is identical before and after;
  - a GROBID that stays down is retried, then recorded `failed`, and not
    queued again;
  - a row the upload wrote first is kept.

## Memory (measured 2026-10-12, before enabling)

The user's collection is not reachable from the sandbox, so the largest paper
was stood in for by a **generated 61 MB, 1,000-page book** with an 820-entry,
three-level outline and incompressible images on every page: larger than the
50 MB upload cap (`upload/validation.ts`), so no stored paper can exceed it.

| | RSS |
|---|---|
| Process before reading | 120 MB |
| PDF bytes loaded | 244 MB |
| **Peak during `readOutline`** | **332 MB** (+212 MB over the process) |
| Ten consecutive reads | plateaus at ~409 MB; no growth after the second |

One read took ~190 ms. The engine is one per process and its WebAssembly heap
keeps its high-water mark, so the cost is bounded by the largest PDF read, not
by how many are read. pg-boss works one contents job at a time
(`localConcurrency` defaults to 1); an upload's extract stage, which has paid
the same cost per upload since task 1, may read alongside it in the same engine,
so the worst case is two such PDFs at once.

## Log

- 2026-10-12: implemented; memory measured; integration-tested.
- 2026-10-12: spec'd.
