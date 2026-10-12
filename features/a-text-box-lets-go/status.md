# Status: A Text Box Lets Go

**Feature state:** **In progress.** Its one task is implemented and verified in
Chromium, and awaits review and the user's phone check.

Spec written against `main` at `b3ae7a2`, from a reproduction in the browser
taken before anything was written. See [research.md](./research.md).

Depends on [`article-detail-and-reader`](../article-detail-and-reader/status.md)
(#9, Complete).

Feature parent issue: [#239](https://github.com/nicbk/nicbk-website/issues/239), with 1 sub-issue. The roadmap entry is **#27** in
[../index.md](../index.md).

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`the-note-is-put-down`](./tasks/the-note-is-put-down/status.md) | Implemented | [#249](https://github.com/nicbk/nicbk-website/pull/249) | Running | Awaiting |

## Definition of Done (feature)

All acceptance criteria met, the task merged behind CI and review, and the
user's phone check passed.

## Log

- 2026-10-12: implemented and verified in Chromium.
- 2026-10-11: reported by the user, reproduced, cause found (a private,
  per-page `editingId` that the reader's paper image keeps the engine from ever
  clearing), spec'd.
