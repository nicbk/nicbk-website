# Status: A Paper Downloads Once

**Feature state:** **In progress** (2026-09-14) — its one task is implemented and in review.

Spec written against `main` at `ef4b3c1`, from a reproduction on `nicbk.com` and a
probe of Garage's conditional reads, both taken before anything was written. See
[research.md](./research.md).

Depends on [`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7, Complete) for storage and object keys, and on
[`article-detail-and-reader`](../article-detail-and-reader/status.md) (#9,
Complete) for the PDF route and the reader.

Feature parent issue: [**#180**](https://github.com/nicbk/nicbk-website/issues/180),
with one sub-issue, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#21** in [../index.md](../index.md). Its parent issue is
**checked** on completion and **closed by hand**.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`unchanged-papers-answer-304`](./tasks/unchanged-papers-answer-304/status.md) | Implemented ([#181](https://github.com/nicbk/nicbk-website/issues/181)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, the task merged
behind passing CI + human review, **and the Safari check on `nicbk.com` run after
deploy** — the largest paper is the case most likely to behave differently in
WebKit, and production is where Caddy and the host's Garage sit.

## Notes carried into implementation

- **Decided with the user: revalidate, not `immutable`.** Per-read session and
  ownership checks stay true for every open.
- **The SDK throws on a 304.** Measured. Translate it to a value in storage.
- **Authorization before revalidation.** A 304 is a successful read.
- **Garage's ETag, not the article id** — correct even if a replace-PDF path is
  ever added.
- **Status is not evidence in the browser.** Transfer size is.

## Log

- 2026-09-14 — **Implemented.** Garage turned out not to compare weak tags, so
  the route strips `W/` before forwarding — found by probing before writing.
- 2026-09-14 — **Spec'd.** Item 2 of the user's list turned out to be one
  placeholder header: `no-store`, whose own comment deferred the decision "if the
  reader turns out to want it". The same 13.4 MB paper downloaded in full twice
  in a row on `nicbk.com`. Garage was probed before the design was chosen and
  answers conditional reads itself, so a 304 reads nothing from storage.
