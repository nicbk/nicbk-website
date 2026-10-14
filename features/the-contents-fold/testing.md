# Testing: The Contents Fold

## Unit

- **The nesting** (pure): a flat list becomes the right tree for:
  - consecutive levels;
  - a skipped level (1 → 3);
  - a list that starts deeper than 1;
  - a single entry;
  - the empty list.
- **What shows** (pure): only the top level when nothing is open; an open
  entry's sections; a closed entry inside an open one hides its own; the
  lone-root rule, if adopted.
- **The marked row** (pure): the section in view when it shows, otherwise its
  nearest shown ancestor.
- **The panel**:
  - the fold control has `aria-expanded` and toggles only its entry;
  - the title jumps and does not fold;
  - leaf rows have no control;
  - the marked row is found and kept in view in a nested list.
- **The mutator** (task 2):
  - owner set;
  - not-owner and anonymous callers refused;
  - an index out of range refused;
  - open twice equals open once;
  - `updated_at` is not written.

## Integration (task 2)

- `mutators.integration.test.ts`, against real Postgres:
  - the column round-trips;
  - ownership is enforced;
  - `updated_at` is unchanged.
- The upload's rewrite of a paper's contents resets `expanded` to `[]`.
- The migration applies from the committed files, and the publication still
  carries the table.

## Browser

Seed the #29 textbook (120 pages, a 252-entry, three-level outline, one
80-character title) and a short paper with a flat outline.

| Check | Where |
|---|---|
| first open shows chapters only; rail, sheet; light, dark | Chrome: 1400px, 1024px, 375px |
| open chapter 3, open 3.2, jump to 3.2.1: lands below toolbar, 3.2.1 marked | Chrome, 1400px |
| close chapter 3 while reading 3.2.1: chapter 3 marked | Chrome, 1400px |
| fold control's box ≥ 24 × 24 px, measured; shortest depth-3 title ≥ 9 characters in the rail | Chrome, 1400px |
| reload: same folds (task 2) | Chrome |
| rail at 1400px, then sheet at 375px: same folds (task 2) | Chrome |
| a second context on the same account sees a fold arrive without reload (task 2) | Chrome, two contexts |
| keyboard only: tab to a chevron, Enter/Space folds, tab to the title, Enter jumps | Chrome |
| the folds and the sheet on a phone | Safari on an iPhone, by the user |
