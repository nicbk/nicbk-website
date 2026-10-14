# Status: The Sections Fold

**State:** Merged ([#258](https://github.com/nicbk/nicbk-website/issues/258); PR [#260](https://github.com/nicbk/nicbk-website/pull/260)).

## What shipped

- **`contents/contents-tree.ts`** (pure):
  - `contentsTree` nests the flat entries by comparing depths, so a skipped
    level nests under the nearest shallower entry;
  - `firstVisitOpen` opens a lone root and nothing else;
  - `markedRow` gives the outermost closed entry above a hidden section.
- **`contents/use-contents-folds.ts`**: `{ expanded, fold }`, where `expanded`
  is null until the first press. It is held in memory by article, outside any
  component, because the phone's sheet unmounts every time a jump closes it.
  Task 2 swaps the store for the synced column and keeps the shape.
- **`contents/contents-panel.tsx`**:
  - nested `<ol>`s;
  - each entry with sections is a Base UI `Collapsible`, with a chevron
    `Trigger` (`aria-label="sections of …"`, `aria-expanded`) beside the title
    button;
  - the marked row is found by `data-index`.
- **`contents/contents-panel.module.css`**:
  - every row keeps a 24px fold column, so titles at a level line up;
  - the column takes the place of the row's old left padding;
  - indent is by level in the tree, half a rem a level, capped at two.
- **`article-sidebar.tsx`** supplies the folds.

## Decided at implementation (2026-10-14)

- **The list follows the reader, not the folds.** Its keep-in-view effect runs
  when the section in view changes, not when the marked row does. Opening a
  chapter can change the marked row (the section inside now shows); a list that
  scrolled in answer would move the row from under the finger that pressed it.
  On touch, `:hover` cannot be relied on to hold it still.
- **Indent is by level in the tree, not by depth.** A depth-3 heading directly
  under a chapter sits one step in, as its place in the tree says.
- **The cost in the rail is about 20px of title width.** Top-level titles
  measured 12.7 characters wide (≈99px), and the narrowest third-level title
  10.8, against #29's bar of 9. The textbook's chapter titles ("Chapter 3:
  Foundations of Chapter 3") take three lines there.

## Verification (Chromium, 2026-10-14)

The seeded #29 textbook (120 pages, a 252-entry, three-level outline, one
80-character title) and a generated four-chapter book whose outline is one
root.

- **First view**: the twelve chapters only, in the rail at 1400px and 1024px
  and in the sheet at 375px, light and dark.
- **A defect found and fixed**: rows with no sections had nothing in the fold
  column, so their title button was auto-placed into it. "3.2.1 Subsection"
  stacked a letter to a line. Titles are now pinned to the second column. After
  the fix, the titles at each level shared one left edge (44, 52 and 60px in
  the rail; 52, 60 and 68px in the sheet).
- **The fold control** is 24.0 × 30.4px. A hit test at its centre answered with
  the control itself, and its box lies within its row.
- **Jump, then fold**:
  - open *Chapter 3*, open *3.2*, choose *3.2.1*: *3.2.1* is marked;
  - close *Chapter 3*: *Chapter 3* is marked;
  - open it again: *3.2.1* is marked again.
- **Keyboard**: the chevron takes focus, and Enter then Space open and close
  it. Tab moves on to the entry's title.
- **Phone**: open *Chapter 3* in the sheet and choose *3.2*. The sheet closes.
  Reopened from the toolbar, *Chapter 3* is still open and *3.2* is marked.
- **Lone root**: the first view is the root and its four chapters. Once
  closed, it stays closed.
- Unit: `contents-tree.test.ts`, `use-contents-folds.test.ts`, the panel's and
  the sidebar's tests.

## Log

- 2026-10-14: merged.
- 2026-10-14: implemented and verified in Chromium.
- 2026-10-14: spec'd.
