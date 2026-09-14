# Status: One Header Row

**Feature state:** **Spec'd** (2026-09-13) — one task, not started.

Spec written against `main` at `1cbb6e8`, from measurements taken in **both
Chrome and Safari** before anything was written. Those measurements contradicted
the report as phrased — the tracker header is the *shorter* row, not the taller
one — and the user confirmed on being shown the numbers that the single pixel is
what they see. See [research.md](./research.md).

Depends on [`app-shell-and-home`](../app-shell-and-home/status.md) (#1, Complete)
for the site header and shell, and on
[`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7) and [`collection-view`](../collection-view/status.md) (#8) for the tracker's.

Feature parent issue: [**#156**](https://github.com/nicbk/nicbk-website/issues/156),
with one sub-issue for the task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#17** in [../index.md](../index.md). Its parent issue is
**checked** when the feature completes and closed by hand if it has not closed
itself — which, on the last three features, it has not.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`one-row-two-item-sets`](./tasks/one-row-two-item-sets/status.md) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, the task merged
behind passing CI + human review. In short: every page's header is the same
height because one value says so, both headers still show exactly what they
showed, and the sticky one is still sticky.

## Notes carried into implementation

- **This reverses a decided document, twice.** Both header specs say the two are
  separate components and not variants of one. The user re-decided that on
  2026-09-13; the revisions are part of the task, not a follow-up.
- **A stylesheet assertion cannot prove this feature works.** jsdom reports every
  rectangle as zero. The unit tier asserts where the height *comes from*; the
  browser asserts the height. Do not let a green suite stand in for the
  measurement.
- **Safari is required, not optional.** The site header's current height is
  fractional (58.59px) and Safari already reports it differently (58). Two of the
  last three visual defects here were engine-specific.
- **`position: sticky` is the fragile part.** Relocating it to a composed class
  changes nothing structurally, but sticky fails silently when an ancestor gains
  `overflow`, so it needs a real scroll rather than a declaration check.
- **1px is visible to this user.** "Close enough" is not a passing result, and
  the whole feature is evidence for that.

## Log

- 2026-09-13 — **Spec'd**, the same day #16 completed. Filed from item 8 of the
  user's list of sixteen. The cause was measured first and did not match the
  report: the two rows differ by 1–1.6px at desktop and are *identical* at 500px,
  with the tracker the shorter of the two. Shown that, the user confirmed the
  pixel is what they meant and chose to merge the two headers into one component
  rather than reconcile two numbers — re-deciding a 2026-07-04 spec in the
  process.
