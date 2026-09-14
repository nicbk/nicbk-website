# Status: A Paper Opens Where You Left It

**Feature state:** **In progress** (2026-09-14) — task 1 in review.

Spec written against `main` at `109c2fb`, from a restore-timing probe in the
local reader. See [research.md](./research.md).

Depends on [`collection-view`](../collection-view/status.md) (#8) and
[`article-detail-and-reader`](../article-detail-and-reader/status.md) (#9), both
Complete.

Feature parent issue: [**#194**](https://github.com/nicbk/nicbk-website/issues/194),
with one sub-issue per task. Roadmap entry **#23**; parent closed by hand on
completion.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`the-position-is-saved`](./tasks/the-position-is-saved/status.md) | In review ([#195](https://github.com/nicbk/nicbk-website/issues/195)) | pending | pending | pending |
| [`the-reader-returns-to-it`](./tasks/the-reader-returns-to-it/status.md) | Not started ([#196](https://github.com/nicbk/nicbk-website/issues/196)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria met, both tasks merged behind CI + review, and the
reload check run in Safari on `nicbk.com`.

## Notes carried into implementation

- **Synced, same spot, applied on open only** — decided with the user.
- **Correct for the viewport gap**, or every open drifts ~7pt (measured).
- **No save before the restore**, or every open writes page 1.
- **Don't touch `updated_at`.**

## Log

- 2026-09-14 — **Spec'd.** A probe confirmed restoring on the first layout-ready
  holds through FitWidth, and found the 10px viewport gap that makes a naive
  round trip creep — and that #22's go-to carries the same error.
- 2026-09-14 — Task 1 `the-position-is-saved` implemented; PR open.
