# Status: Reader Marking a Passage

**Feature state:** **Complete** (2026-09-11) — both tasks merged behind green CI
and human review, the last as `ef1ff81`
([PR #133](https://github.com/nicbk/nicbk-website/pull/133)). Spec'd and built
the same day, from measurements taken that morning.

Depends on [`article-detail-and-reader`](../article-detail-and-reader/status.md)
(#9, Complete) for the tools, the floating menus and the annotation path, and on
[`reader-touch-and-gestures`](../reader-touch-and-gestures/status.md) (#12,
Complete) for the touch selection this feature makes usable.

Feature parent issue: [**#128**](https://github.com/nicbk/nicbk-website/issues/128),
with one sub-issue per task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#15** in [../index.md](../index.md). **#128 closed
itself** when the last sub-issue closed — the first feature here where that
happened, and the evidence that GitHub's behaviour changed is recorded in
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md)'s
2026-09-11 revision.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`ending-a-selection`](./tasks/ending-a-selection/status.md) ([#129](https://github.com/nicbk/nicbk-website/issues/129)) | **Merged** | [#132](https://github.com/nicbk/nicbk-website/pull/132) | Green | Merged 2026-09-11 |
| [`marking-from-the-selection`](./tasks/marking-from-the-selection/status.md) ([#130](https://github.com/nicbk/nicbk-website/issues/130)) | **Merged**, last of the two | [#133](https://github.com/nicbk/nicbk-website/pull/133) | Green | Merged 2026-09-11 |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, each task
merged behind its own passing CI + human review. In short: a reader selects a
sentence with a finger and taps *highlight* and the sentence is highlighted, on
one page or across a break; a markup tool dragged across a page break marks both
pages; and a selection spanning two pages offers its copy control like any
other.

## Notes carried into implementation

- **This feature exists because #12's last task measured its own premise and
  found it false.** Task 5's constraints asserted that a markup tool already
  marks a whole multi-page selection "as a pointer drag does". It does not, and
  the acceptance line could not be met. The lesson is recorded here rather than
  only in that task: **an acceptance criterion that describes existing behaviour
  is a measurement, not a given.**
- **One cause, three symptoms** — and only two of them were reported. The
  missing copy control on a cross-page selection was found while measuring, and
  it is the one a user would have been least able to describe, because ⌘C keeps
  working.
- **The library's end-of-selection event is the whole subject.** Everything
  downstream of it — committing a markup tool, placing the floating menu, the
  `selecting` flag — is fine; the event simply does not arrive. See
  [research.md](./research.md) for the two code paths and their line numbers.
- **Two guards, each right, leave a touch reader no path to a tool**: picking
  one clears the selection, and a live tool takes the hold. Neither is to be
  reversed — the feature routes around both by marking from the selection
  itself.
- **`annotation-sync/` is not implicated in any of this**, which was checked
  rather than assumed: the cross-page markup produces *zero* engine events, so
  nothing reaches this project's own code.
- **Marks must take their shape from the live tool's `defaults`**, so the
  duplicated commit cannot drift from the library on colour, opacity or flags.
- **This is the first feature whose whole subject is a dependency's behaviour.**
  The decision not to patch was taken with the user and is recorded with its
  costs; if a later task finds the public API genuinely insufficient, that is a
  decision to re-take rather than to route around.

## Log

- 2026-09-11 — **Both tasks merged and the feature is complete**, the same day
  it was spec'd. What the building added to the record, beyond the code:
  **a JS-dispatched `PointerEvent` does not drive the library's mouse
  selection**, which briefly looked like a width-dependent defect and was the
  measuring instrument (task 1's status); **the coverage ratchet earned its
  keep**, catching three code paths no test reached and turning a number into
  two better tests; and **GitHub now closes a parent issue itself**, which is
  recorded as a revision rather than an edit because the old behaviour was real
  when it was written.
  What is left open on purpose is what #12 left open: **no part of this has met
  a real thumb.**
- 2026-09-11 — **Spec'd**, the day #12 completed, from two defects #12's last
  task measured and one this feature's own research found. Causes measured
  before anything was written, as #12, #13 and #14 were: the reading turned
  three symptoms into one cause, and the two open design questions — where the
  fix lives, and how a touch reader marks — were settled with the user before
  any code.
