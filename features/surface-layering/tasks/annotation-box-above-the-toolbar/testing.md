# Testing: Annotation Box Above the Toolbar

Feature-wide tiers are in [../../testing.md](../../testing.md).

## Unit (Vitest, jsdom)

As with task 1, jsdom cannot answer "what is on top". What it holds:

- The chosen declaration exists where the remedy puts it.
- **The pages' rule and the annotation box's rule are asserted together**, so a
  change that frees the box by removing the containment altogether — which would
  restore the older defect — fails here.

If the remedy turns out to be a portal rather than a layer, the unit tier
asserts instead that the box is rendered outside the viewport subtree, which is
a tree fact jsdom *can* answer.

## Integration

Not applicable.

## Browser verification (record in status.md — primary evidence)

**Chrome and Safari, both.** Needs a real PDF open and a real selection — the
box only exists while a mark is selected, so this cannot be checked on an empty
reader.

For each claim: both rectangles, **assert overlap**, `elementFromPoint` at the
centre of the overlap, report the receiving element by identity.

- **Annotation box above the toolbar** — make a selection near the top of the
  page so the box overlaps the bar. Expected: the box. Record the *before*
  result too, so the defect is shown reproduced rather than asserted.
- **Page one below the toolbar** — the regression. Scroll so a page overlaps the
  bar and probe. Expected: the toolbar. **This check is not optional**; it is
  the earlier user report.
- **The box is still positioned against its mark** — that it is on top is not
  enough if the remedy moved it. Compare its position to the mark's rectangle
  before and after.
- Both themes, and a narrow width where the toolbar's position changes.
- Touch selection still works (#12's behaviour) — the box is reached by finger
  as well as by pointer.

## Coverage

Ratchet applies.
