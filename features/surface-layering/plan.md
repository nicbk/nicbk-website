# Plan: Surface Layering

**Two tasks**, each gated by its own PR + CI + human review.

## Why two and not one

Because the two surfaces share a *cause* but not a *remedy*, and only one of the
remedies is known.

The collection toolbar's fix is measured and verified end to end, including
against both regressions the code comments warn about. The reader's is not: its
cause is confirmed by experiment, but which remedy applies depends on where
EmbedPDF renders the annotation box relative to its page wrappers, which needs a
live selection to answer. Bundling them would hold a finished, verified fix
behind an open question.

They are one feature rather than two because the *reason* is shared, the
guideline they both violate is shared, and the second is far easier to get right
having written the first.

## Task 1 — [`toolbar-above-the-collection`](./tasks/toolbar-above-the-collection/description.md)

- `isolation: isolate` on the collection page, `z-index: 1` on the toolbar.
- A comment that replaces the wrong reasoning with the measured one, naming
  Safari and naming why isolation is what makes the z-index safe.
- The AGENTS.md browser-verification change, since this is the task that proves
  the gap exists.

**Delivers:** the search row stays above the collection in Safari, and menus,
dialogs and backdrops still cover it.

## Task 2 — [`annotation-box-above-the-toolbar`](./tasks/annotation-box-above-the-toolbar/description.md)

- Measure first: where the annotation box sits relative to EmbedPDF's page
  wrappers, with a selection live on screen.
- Then either scope the containment to the pages, or lift the box out of the
  subtree — whichever the measurement permits.
- The pages must still not paint over the toolbar. That is the earlier report
  this cannot undo.

**Delivers:** a mark's controls are reachable over the toolbar, and the paper
stays under it.

## Risks, named up front

- **Fixing task 2 can re-break an older report.** The rule being changed exists
  because the paper painted over the toolbar. Its acceptance criteria therefore
  include the *old* defect as a regression test, not just the new one.
- **A maximum z-index does not escape a stacking context.** Proven here:
  `2147483647` inside the viewport still lost. Any remedy that reads as "raise
  the annotation box" is wrong unless it also leaves the subtree or removes the
  context.
- **Isolation is load-bearing, and silently so.** `z-index: 1` alone re-creates
  the popup and backdrop defects. A future reader deleting `isolation: isolate`
  as redundant would reintroduce them, which is why the constraint asks for a
  test on the relationship rather than a comment asking nicely.
- **Two engines now, not one.** Both tasks must be exercised in Chrome *and*
  Safari. A pass in one is not evidence about the other — that is the whole
  finding behind this feature.
- **The user reads production, not localhost.** The toolbar defect appeared on
  `nicbk.com`. Local verification is necessary and not sufficient; the exit
  check belongs on the deployed host.
