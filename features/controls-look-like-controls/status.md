# Status: Controls Look Like Controls

**Feature state:** **Complete** (2026-09-14) — both tasks merged behind green CI
and human review, and parent issue #161 closed by hand.

**The spinner wobble is confirmed fixed** (user, 2026-09-14), which turns this
feature's most uncertain change into its most useful finding: see
[research.md](./research.md).

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
The roadmap entry is **#18** in [../index.md](../index.md). Its parent issue was
**checked** on completion and had **not** closed itself, so it was closed by
hand — the fifth in a row (#135, #140, #149, #156, #161) against the one feature
that closed itself.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`pressable-things-look-pressable`](./tasks/pressable-things-look-pressable/status.md) | **Merged** ([#162](https://github.com/nicbk/nicbk-website/issues/162)) | [#165](https://github.com/nicbk/nicbk-website/pull/165) | green | approved |
| [`the-upload-controls-look-finished`](./tasks/the-upload-controls-look-finished/status.md) | **Merged** ([#163](https://github.com/nicbk/nicbk-website/issues/163)) | [#166](https://github.com/nicbk/nicbk-website/pull/166) | green | approved |

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

- 2026-09-14 — **Feature complete**, and the uncertain change turned out to be
  the informative one. **The user confirms the spinner wobble is gone**, which
  settles a cause that could not be measured from this side: the icon's art was
  proved centred, the box was measured fractional, and moving the pivot from
  9.2px onto 9px fixed it. Holding back the composited-layer fallback is what
  made that an *answer* rather than two changes and a shrug — worth repeating
  whenever a fix has to be judged by someone else's eyes. Also worth carrying
  forward: task 2's picker was rejected on review for satisfying its acceptance
  criterion without designing anything, because the criterion named a visual
  property ("a dotted boundary") instead of an outcome.
- 2026-09-13 — **Task 2 implemented.** The "+" is 39.5 × 39.5 (aspect 1.000)
  with the row's `align-items: stretch` untouched, the picker has a dashed
  boundary that deliberately stops short of promising a drop it cannot accept,
  and the spinner's box is 18 × 18 with its pivot on the grid. One thing turned
  up while doing it: `1.15em` is a house value in **eleven** stylesheets, with
  the reader deriving `--reader-control-height` from it — so only the icon that
  actually rotates was changed, since a glyph rasterized once does not judder.
- 2026-09-13 — **Task 1 merged** (#165).
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
