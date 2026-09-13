# Constraints and Behavior: Annotation Box Above the Toolbar

The second half of [the feature's criteria](../../constraints-and-behavior.md),
and the half whose remedy is not yet known.

## Satisfied here

- The annotation box receives the hit where it overlaps the reader toolbar, in
  **Chrome and Safari**.
- **Page one does not** receive a hit over the toolbar — the earlier defect,
  kept as a regression test.
- The reader's other overlays are unaffected: page navigation, the reader
  notice, the article menu opened from the header.
- The chosen order is declared in the stylesheet and asserted by a test.

## Must not regress

- The paper staying below the toolbar, at any zoom and any scroll position. This
  is a **user-reported defect that was already fixed once**; re-breaking it
  trades one report for another.
- EmbedPDF's own positioning of the selection menu against a mark, including the
  counter-rotation it applies.
- Touch behaviour established by #12: the pinch gesture, touch selection, and
  the pointer routing during a gesture.
- The reader's scroll containment and `touch-action` declarations.

## Constraints particular to this task

- **Measure before choosing.** Whether the annotation box is rendered inside one
  of EmbedPDF's `position: relative; z-index: 1` page wrappers decides the
  remedy: inside one, no layer value can free it and a portal is required;
  outside, narrowing the containment to the pages is enough. This is measured
  with a **live selection on screen** before any code is written, and the answer
  is recorded in status.md.
- **A raised number is not a remedy.** A probe at `z-index: 2147483647` inside
  the viewport still lost to the toolbar (feature research.md). Any approach
  that does not leave the subtree or remove the context is wrong by
  construction, whatever number it carries.
- **If the remedy is a portal, EmbedPDF's positioning must survive it.** The box
  is positioned by the engine against a mark that lives in the document; moving
  it out of that subtree without carrying the positioning would leave it
  correctly layered and in the wrong place. That trade is not acceptable —
  raise it rather than take it.
- **The comment records both directions.** What the annotation box beats, what
  still beats the pages, and the report each of those exists for.

## Cross-cutting

- Verification is by **hit-test with the overlap asserted first**, in both
  engines, both themes, and at a narrow width where the toolbar moves.
- The regression check is as important as the new behaviour and is listed in
  the acceptance criteria rather than left to judgement.
- WCAG 2.2 AA: the box must be reachable as well as visible — if it can be
  covered, it can also be untouchable, so the hit-test *is* the accessibility
  check here.
- CI green: Biome, typecheck, unit + integration with ratchet coverage, PR-title
  lint.
