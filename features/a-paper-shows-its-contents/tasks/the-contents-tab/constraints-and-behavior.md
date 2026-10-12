# Constraints and Behavior: The Contents Tab

The feature's "The tab" and "The strip" behavior, plus:

- **One more entry in `TABS`** in `article-sidebar.tsx`, with a glyph (lucide
  `ListTree`). It is placed between *citations* and *annotations*.
- **The jump goes through the reader-jump bridge the annotations list already
  uses** (`reader-jump.tsx`), extended from "a page" to "a page and a top".
  There is no second path into the reader.
- **The strip's widths are made equal in glyph mode** (`flex: 1 1 0`), and the
  sheet's container threshold is re-measured for five words. Both numbers are
  recorded in the stylesheet's comment, as the existing threshold's is.
- **`research/ui-ux/pages/lit-tracker/pages/article-detail.md` gets a
  revision** recording the fifth tab and why.

## Acceptance

The feature's criteria 5–7.
