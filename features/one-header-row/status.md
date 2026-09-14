# Status: One Header Row

**Feature state:** **Complete** (2026-09-13) — its one task merged behind green
CI and human review, and parent issue #156 closed by hand.

**Every header on the site measures 56.00px**, in Chrome and in Safari, from one
declaration. The old 58.59 and 57.00 were two independent sums with no reason to
agree and no test holding them there.

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
The roadmap entry is **#17** in [../index.md](../index.md). Its parent issue was
**checked** on completion and **had not closed itself** — the fourth in a row
(#135, #140, #149, #156) against the single feature that did, so it was closed by
hand.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`one-row-two-item-sets`](./tasks/one-row-two-item-sets/status.md) | **Merged** ([#157](https://github.com/nicbk/nicbk-website/issues/157)) | [#159](https://github.com/nicbk/nicbk-website/pull/159) | green | approved |

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

- 2026-09-13 — **Feature complete.** #159 merged, #156 closed by hand. The
  lesson worth keeping is not about headers: **a measurement can confirm a report
  is real while showing its stated cause is wrong.** The rows were 1–1.6px apart
  and the tracker was the *shorter* one, which made the phrase "the tracker
  header is taller" false and the complaint behind it true. Reporting the numbers
  rather than a verdict is what let the user decide that, and it is also what
  turned a 1px cosmetic fix into removing a duplicated computation. The second
  keeper: **1px is visible to this user**, so "too small to see" is not a
  conclusion the agent gets to reach on their behalf.
- 2026-09-13 — **Implemented.** Every header on the site now measures **56.00px**
  in Chrome and **56.00px** in Safari — one declaration, one number, and for the
  first time the same integer in both engines. The browser found nothing to fix,
  which is the expected shape for a change that *removes* a computation: the
  three preceding tasks each found a defect the unit tier could not, and each was
  adding behaviour. See the
  [task's status](./tasks/one-row-two-item-sets/status.md) for the measurements
  and for the one deviation from this spec — the row class is applied by the
  component rather than composed in by each caller, so a future header cannot
  forget it.
- 2026-09-13 — **Spec'd**, the same day #16 completed. Filed from item 8 of the
  user's list of sixteen. The cause was measured first and did not match the
  report: the two rows differ by 1–1.6px at desktop and are *identical* at 500px,
  with the tracker the shorter of the two. Shown that, the user confirmed the
  pixel is what they meant and chose to merge the two headers into one component
  rather than reconcile two numbers — re-deciding a 2026-07-04 spec in the
  process.
