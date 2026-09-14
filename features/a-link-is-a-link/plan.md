# Plan: A Link Is a Link

Three tasks. The first fixes the reported defect on its own; the second is pure
and testable without a browser; the third is the one with UI.

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`links-stay-put`](./tasks/links-stay-put/description.md) | [#186](https://github.com/nicbk/nicbk-website/issues/186) | Links locked; URL click copies with a toast; internal links inert |
| 2 | [`where-a-link-points`](./tasks/where-a-link-points/description.md) | [#187](https://github.com/nicbk/nicbk-website/issues/187) | The pure resolver from link + text runs to a preview region |
| 3 | [`a-citation-previews-in-place`](./tasks/a-citation-previews-in-place/description.md) | [#188](https://github.com/nicbk/nicbk-website/issues/188) | The popover: rendered crop, "go to p. N" |

## Why this order

- **Task 1 alone fixes what was reported.** Internal links are inert between
  task 1 and task 3 — which is strictly better than today, where clicking one
  offers to delete it.
- **Task 2 before task 3** so the popover is built on geometry already proven
  against every measured shape, rather than debugged through a popover.

## Risks

- **The lock reaches marks.** The link tool's default categories are the
  highlighter's. Tested by selecting a mark after the lock.
- **Locked links swallow text selection.** Checked in the browser by highlighting
  across a citation in both directions.
- **Heuristics on unmeasured layouts.** The rules are measured on five
  documents. A target that resolves badly degrades to a crop of the wrong region,
  with "go to" still correct — never an error.
- **A link inside a mark.** Raised in task 3 with the measured behaviour.

## Dependencies

Depends on **#9** (reader, annotations) and **#15** (text tools over selections).
**#10** later adds "open the cited article" beside the preview.
