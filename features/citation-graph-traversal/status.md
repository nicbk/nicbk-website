# Status: Citation-Graph Traversal

**Feature state:** **Spec'd** (2026-09-14): 4 tasks, not started.

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
| [`the-references-can-be-trusted`](./tasks/the-references-can-be-trusted/status.md) | Not started ([#202](https://github.com/nicbk/nicbk-website/issues/202)) | — | — | — |
| [`citations-are-queryable`](./tasks/citations-are-queryable/status.md) | Not started ([#203](https://github.com/nicbk/nicbk-website/issues/203)) | — | — | — |
| [`the-citations-view`](./tasks/the-citations-view/status.md) | Not started ([#204](https://github.com/nicbk/nicbk-website/issues/204)) | — | — | — |
| [`the-way-back`](./tasks/the-way-back/status.md) | Not started ([#205](https://github.com/nicbk/nicbk-website/issues/205)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria met, all four tasks merged behind CI + review, and the
flow checked in Safari on `nicbk.com`.

## Notes carried into implementation

- **Hidden, not unloaded**: the reader stays mounted behind Citations (decided
  with the user).
- **A path, not a log**, in the URL (decided with the user).
- **Outside references link to Semantic Scholar** (revised with the user).
- **The backfill never writes a field a reader can edit.**

## Log

- 2026-09-14 — **Spec'd.**
  - Measured the local graph and the reader's remount cost on `nicbk.com`.
  - A candidate merged-row rule matched exactly the two known rows.
  - Four questions decided with the user, including rejecting a growing trail in
    favour of a short path.
