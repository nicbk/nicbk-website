# Status: Citation-Graph Traversal

**Feature state:** **In progress** (2026-09-15): 5 tasks; tasks 1–4 merged, task
5 implemented and in review.

Spec written against `main` at `daa8fc2`. See [research.md](./research.md).

Depends on [`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7), [`article-detail-and-reader`](../article-detail-and-reader/status.md) (#9)
and [`a-paper-opens-where-you-left-it`](../a-paper-opens-where-you-left-it/status.md)
(#23), all Complete.

Feature parent issue: [**#201**](https://github.com/nicbk/nicbk-website/issues/201),
with one sub-issue per task. Roadmap entry **#10**; parent closed by hand on
completion.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`the-references-can-be-trusted`](./tasks/the-references-can-be-trusted/status.md) | Complete ([#202](https://github.com/nicbk/nicbk-website/issues/202)) | [#208](https://github.com/nicbk/nicbk-website/pull/208) | Pass | Merged |
| [`older-papers-are-re-read`](./tasks/older-papers-are-re-read/status.md) | Complete ([#207](https://github.com/nicbk/nicbk-website/issues/207)) | [#209](https://github.com/nicbk/nicbk-website/pull/209) | Pass | Merged |
| [`citations-are-queryable`](./tasks/citations-are-queryable/status.md) | Complete ([#203](https://github.com/nicbk/nicbk-website/issues/203)) | [#210](https://github.com/nicbk/nicbk-website/pull/210) | Pass | Merged |
| [`the-citations-view`](./tasks/the-citations-view/status.md) | Complete ([#204](https://github.com/nicbk/nicbk-website/issues/204)) | [#211](https://github.com/nicbk/nicbk-website/pull/211) | Pass | Merged |
| [`the-way-back`](./tasks/the-way-back/status.md) | Implemented ([#205](https://github.com/nicbk/nicbk-website/issues/205)) | — | — | In review |

## Definition of Done (feature)

All acceptance criteria met, all five tasks merged behind CI + review, and the
flow checked in Safari on `nicbk.com`.

## Notes carried into implementation

- **Hidden, not unloaded**: the reader stays mounted behind Citations (decided
  with the user).
- **A path, not a log**, in the URL (decided with the user).
- **Outside references link to Semantic Scholar** (revised with the user).
- **The re-read never writes a field a reader can edit.**
- **The re-read is visible**: one summary row while it runs; a failure stays, with try again and no dismiss (decided with the user).
- **The path is width-stepped**: how many papers the header shows is decided by
  how many characters the row actually holds, with the "⋯" menu always holding
  the whole path, and a cycle collapses to where it began (decided with the user
  after measuring the header).
- **Two directions, not three places**: the citations view is *cites* (grouped into your collection and elsewhere) and *cited by*; no count comparison; the Semantic Scholar credit is in the tracker header (decided with the user after trying the first build).

## Log

- 2026-09-14 — **Spec'd.**
  - Measured the local graph and the reader's remount cost on `nicbk.com`.
  - A candidate merged-row rule matched exactly the two known rows.
  - Four questions decided with the user, including rejecting a growing trail in
    favour of a short path.
- 2026-09-14 — **Task 1 implemented; the backfill split out as task 2** (#207).
  Asked how a backfill runs on a self-deploying host, the user wanted it
  automatic and visible: a summary row in the upload status indicator while it
  runs, and a failure that stays, with try again and no dismiss, until it
  succeeds. `references_read_at` added to mark papers already read.
- 2026-09-14 — #208 merged. Task 2 implemented; verified on the local stack, including a real try again through Semantic Scholar's rate limiting.
- 2026-09-15 — #209 merged. Task 3 implemented: owner-scoped citation queries, first use of `related()`.
- 2026-09-15 — #210 merged. Task 4 implemented (#211), then reworked after the user tried it: two tabs, no shortfall message, credits in the header.
- 2026-09-15 — #211 merged without its last commit (the per-paper reader fix); carried to main separately.
- 2026-09-15 — Task 5 implemented. The user asked whether a path could be read
  in the header at all; measuring it said no below ~1100px for three papers, so
  what shows steps down with the width and the "⋯" menu carries the rest. A
  fourth paper (RoBERTa) was uploaded through the app to walk a four-step path.
