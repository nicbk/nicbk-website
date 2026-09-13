# Status: Annotation Box Above the Toolbar

**State:** Not started. Task 2 of 2 — second because its cause is confirmed but
its remedy is not, and task 1 settles the pattern both should follow.

- Branch: `surface-layering/annotation-box-above-the-toolbar`, from `main` with
  task 1 merged.
- Sub-issue: [**#151**](https://github.com/nicbk/nicbk-website/issues/151).
- PR: opened once the unit tier and the two-engine browser pass are clean.
- **On merge this completes #16** — check the parent issue and close it by hand
  if it has not closed itself (#11's did not).

## Why this task exists

A mark's controls are drawn underneath the reader toolbar, so a reader marking a
passage near the top of the page cannot see or reach what they just marked.

## The cause, confirmed by experiment

`pdf-reader.module.css:52` sets `position: relative; z-index: 0` on the
viewport, commented *"A stacking context of its own, so nothing the engine draws
can rise above the toolbar."*

Measured on `nicbk.com` in Safari by injecting a probe **inside** the viewport,
over the toolbar, carrying `z-index: 2147483647` — the largest value a
stylesheet can express:

```
viewport{pos:relative,z:0} toolbar{pos:absolute,z:auto}
  => TOOLBAR ON TOP (probe TRAPPED by stacking context)
```

Nothing in that subtree can rise above the bar at any z-index. The annotation
box is drawn by EmbedPDF inside it, so it is trapped along with the pages —
which is exactly what the comment says the rule is for.

**The rule was added for an earlier user report**: the paper painted over the
toolbar and the bar vanished behind page one. So the two reports are in conflict
through one line of CSS, and this task's job is to separate "the paper" from "UI
drawn over the paper" rather than trade one for the other.

## Open items to settle while writing

- **Where EmbedPDF renders the annotation box relative to its page wrappers.**
  The engine wraps each page in `position: relative; z-index: 1`. If the box is
  rendered *inside* one of those, removing the viewport's context frees nothing
  — it would be trapped one level down — and the remedy must be a portal.
  Outside, narrowing the containment to the pages suffices. **Measure this with
  a live selection before writing any code**; two guesses from code comments
  were already wrong while this feature was being researched.
- **If the answer is a portal, whether EmbedPDF's positioning survives the
  move.** The box is placed against a mark in the document and counter-rotated
  by the engine. Correctly layered and in the wrong place is not an improvement;
  if the positioning cannot come along, raise it rather than take the trade.
- **How the test states the pairing.** Freeing the box by deleting the
  containment outright would pass a naive "is the box on top" test and restore
  the older defect. The unit assertion has to bind the two rules together.

## Log

- 2026-09-13 — Filed with the feature. Cause confirmed by experiment; remedy
  deliberately left open pending one measurement.
