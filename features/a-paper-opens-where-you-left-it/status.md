# Status: A Paper Opens Where You Left It

**Feature state:** **Complete** (2026-09-14) — both tasks merged (#198, #199), Safari check passed on `nicbk.com`.

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
| [`the-position-is-saved`](./tasks/the-position-is-saved/status.md) | Complete ([#195](https://github.com/nicbk/nicbk-website/issues/195)) | [#198](https://github.com/nicbk/nicbk-website/pull/198) | Pass | Merged |
| [`the-reader-returns-to-it`](./tasks/the-reader-returns-to-it/status.md) | Complete ([#196](https://github.com/nicbk/nicbk-website/issues/196)) | [#199](https://github.com/nicbk/nicbk-website/pull/199) | Pass | Merged |

## Definition of Done (feature)

All acceptance criteria met, both tasks merged behind CI + review, and the
reload check run in Safari on `nicbk.com`.

## Notes carried into implementation

- **Synced, same spot, applied on open only** — decided with the user.
- **Correct the reported offset for the viewport gap**, or every open drifts
  ~7pt (measured; the scroll itself is exact — research §4a).
- **No save before the restore**, or every open writes page 1.
- **Don't touch `updated_at`.**

## Log

- 2026-09-14 — **Spec'd.** A probe confirmed restoring on the first layout-ready
  holds through FitWidth, and found the 10px viewport gap that makes a naive
  round trip creep — and that #22's go-to carries the same error.
- 2026-09-14 — Task 1 `the-position-is-saved` implemented; PR open.
- 2026-09-14 — #198 merged. Task 2 implemented; the gap correction moved to the reading side after a DOM measurement (research §4a).
- 2026-09-14 — **Complete.** #199 merged and deployed. Safari on `nicbk.com`,
  *A Neural Probabilistic Language Model*: scrolled to p. 4, 295.79pt; three
  reloads each reopened at p. 4, 295.79pt, scrollTop 3090. Opened in Chrome — a
  different client, at 114.7% rather than 114.0% — it landed at p. 4, 295.84pt,
  so the position was stored by the server, not only in Safari's local copy.
  Parent #194 closed by hand.
