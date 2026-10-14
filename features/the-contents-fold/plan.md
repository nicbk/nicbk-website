# Plan: The Contents Fold

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`the-sections-fold`](./tasks/the-sections-fold/description.md) | — | The nested list, the fold control, everything closed on open, the marked ancestor. Folds are held for the page visit only. |
| 2 | [`the-folds-are-kept`](./tasks/the-folds-are-kept/description.md) | — | `article_contents.expanded`, its migration and mutator, the upload's reset, and the panel reading and writing it. |

**Task 1 first.** It is the part to judge by eye, so it reaches review on its
own: the control's place in a 143px rail, and the list on a textbook. Task 2
then changes only where the state lives. #23 went the other way (schema first)
because its UI could not exist without the columns. Folding can.

Between the two merges, the contents reopen fully folded each time. That
matches O3 for a first visit, and nothing is lost.

## To decide with the user

1. **A lone root.** Some PDFs nest the whole outline under one entry, the
   book's or paper's title. Fully folded, that is one row. **Recommendation:**
   when the top level is a single entry, open it on the first visit, so the
   first view is the chapters. That is the intent of "fully collapsed": the
   fewest rows that still say what the paper contains.
2. **The section in view inside a closed entry.** **Recommendation:** mark the
   closed entry it belongs to, and open nothing by itself (see
   [constraints-and-behavior.md](./constraints-and-behavior.md)). The
   alternative, opening the path to it, would rewrite the user's saved folds
   while they read.
3. **The title does not fold.** **Recommendation:** a separate chevron.
   Pressing a chapter's title to go there would otherwise also open or close
   it, and a jump would change what is saved. The cost is a second press to
   see a chapter's sections after jumping to it.

## Risks

- **Width in the rail.** A 24px control before a title costs a sixth of the
  143px rail at the top level. The indent per level may have to become the
  chevron's own column rather than adding to it. Measure the shortest title
  width at depth 3 on the textbook against #29's (≥ 9 characters), and keep it.
- **`keepInView` assumes a flat list** (`list.children[index]`). It must find
  the marked row by data attribute in a nested list, or it will scroll to the
  wrong row with no error.
- **The marked row being hidden** in a closed entry must fall back to its
  ancestor. That is a pure function of the entries, the open set and the
  section in view, and it is unit-tested.
- **Index-keyed state outliving its list.** Covered by the reset in the upload's
  rewrite, and by the mutator refusing an index past the end.

## Dependencies

#29 (the contents tab and table) and #23 (the pattern for synced per-paper
state). Both are complete.
