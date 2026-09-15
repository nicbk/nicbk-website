# Status: Citation-Graph Traversal

**Feature state:** **In progress** (2026-09-14): 5 tasks; tasks 1–3 merged, task 4 in review.

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
| [`the-citations-view`](./tasks/the-citations-view/status.md) | In review ([#204](https://github.com/nicbk/nicbk-website/issues/204)) | pending | pending | pending |
| [`the-way-back`](./tasks/the-way-back/status.md) | Not started ([#205](https://github.com/nicbk/nicbk-website/issues/205)) | — | — | — |

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
- **On a phone the citations view's controls sit in the credit row**, and its tabs show a glyph, count and short word (decided with the user).

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
- 2026-09-15 — #210 merged. Task 4 implemented; the phone layout of the citations view decided with the user.
