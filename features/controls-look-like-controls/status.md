# Status: Controls Look Like Controls

**Feature state:** **In progress** (2026-09-13) — task 1 implemented and
awaiting review, task 2 not started.

Spec written against `main` at `6290ca8`, from measurements taken on the running
page before anything was written. See [research.md](./research.md).

Depends on [`collection-view`](../collection-view/status.md) (#8, Complete) for
the filter rail and the toolbar, [`blog`](../blog/status.md) (#4, Complete) for
the shared toggle's other consumer, and
[`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7, Complete) for the upload modal and status indicator.

Feature parent issue: [**#161**](https://github.com/nicbk/nicbk-website/issues/161),
with one sub-issue per task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#18** in [../index.md](../index.md). Its parent issue is
**checked** when the feature completes and **closed by hand** — four of the last
five did not close themselves, so expect to.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`pressable-things-look-pressable`](./tasks/pressable-things-look-pressable/status.md) | Implemented ([#162](https://github.com/nicbk/nicbk-website/issues/162)) | — | — | — |
| [`the-upload-controls-look-finished`](./tasks/the-upload-controls-look-finished/status.md) | Not started ([#163](https://github.com/nicbk/nicbk-website/issues/163)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, both tasks
merged behind passing CI + human review. In short: a reader can tell which words
in the rail are filters, the "+" is square, the picker looks like somewhere to
put a file, and the spinner's box is a whole number of pixels.

## Notes carried into implementation

- **This implements a decided document rather than reversing one.**
  `collection-view.md` already says a quiet heading over each group is what makes
  the two selection rules visible. The heading was made quiet; the control was
  never made loud, so there was no contrast to carry the meaning.
- **The direction of the fix was forced, not chosen.** `--color-text-muted` is
  the contrast floor and `contrast.test.ts` holds it — fading the label further
  already failed an axe scan once. Only the control can move.
- **The user chose to change the blog too** (2026-09-13), knowing it alters a
  page they did not report. The blog has the identical heading/toggle pair and is
  saved only by the `#` its tags carry.
- **Raising the resting colour makes the pressed state's bold load-bearing.**
  Accent + bold was belt-and-braces for WCAG 1.4.1; with resting and pressed
  closer together it is now the thing doing the work. Check it in both themes.
- **`align-items: stretch` on the toolbar is a fix, not an accident.** It was
  added because three controls sized themselves differently and looked ragged.
  Task 2 must not undo that while squaring the "+".
- **The spinner is a candidate, not a cure.** Its art was proved centred; its box
  was measured fractional (18.4px). The integer box removes the one measured
  candidate and **the user judges the result** — the artifact is below what the
  agent can resolve, and that was established rather than assumed.

## Log

- 2026-09-13 — **Task 1 implemented.** One declaration, and the browser
  confirmed three separated states on both surfaces in both themes: heading
  `rgb(89,89,89)`, resting `rgb(31,31,31)`, pressed `rgb(11,87,208)` + weight
  700 in light, and the dark-theme equivalents. The rail now reads as grey
  labels over near-black controls. Two things could not be measured and are
  named in the task's status rather than glossed: the narrow-screen drawer (the
  tab never hydrates, so nothing responds to a click) and the axe scans (in the
  deferred Playwright suites).
- 2026-09-13 — **Spec'd**, the same day #17 completed. Filed from four items of
  the user's list of sixteen, measured first. The measurement ruled out the
  obvious cause of the spinner wobble (off-centre art — the path is an arc of a
  circle on the viewBox centre) and turned up something the report did not
  mention: **the blog has the same heading/toggle collision**, one `#` away from
  showing. The remedy's direction was then forced by the contrast floor rather
  than picked.
