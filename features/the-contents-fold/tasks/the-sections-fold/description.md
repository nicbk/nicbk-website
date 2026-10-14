# Task: The Sections Fold

Task 1 of 2 of [#30](../../description.md). Sub-issue: not yet created.

The contents list becomes nested. An entry with sections under it gets a fold
control, and every entry starts closed, except a lone root, which starts open. The marked section falls back to its
closed ancestor. The open set is React state for the page visit; task 2 moves
it to the account.

## Changes

- **`contents/contents-tree.ts`** (new, pure). It turns the flat entries into
  nodes, each holding its index, its entry and its child nodes. It also answers
  "which indices show, given the open set" and "which shown index stands for
  the section in view".
- **`contents/contents-panel.tsx`**:
  - renders the tree as nested `<ol>`s;
  - each parent row is a Base UI `Collapsible` with a chevron `Trigger` beside
    the title button;
  - the open set comes in as props (`open`, `onOpenChange(index, open)`), so
    task 2 only swaps where it comes from.
- **`contents/keep-in-view.ts`'s caller** finds the marked row by
  `data-index`, not by child position.
- **`contents/contents-panel.module.css`**: the chevron column, the indent per
  level, and leaf titles aligned with parent titles.
- **The sidebar** (or `use-article-contents.ts`) holds the open set in state,
  shared by the rail and the sheet within the visit.
