# Constraints and Behavior: Article Cards

Which of the feature's acceptance criteria
([../../constraints-and-behavior.md](../../constraints-and-behavior.md)) this
task satisfies.

## Satisfied here

**From "The article card" — everything except the menu and tags:**

- A card shows **title, publication year, and venue** where present, with any
  absent field simply not drawn.
- **Authors** follow the "fewer than three → all; three or more → first author +
  et al." rule, via the existing `formatAuthors`.
- **No date-added field.**
- The cards are laid out as a **grid that collapses to a single column** on
  narrow screens, and the **card itself adapts by container query** so it is
  correct in any container it is placed in.
- The card **does not navigate** and offers no affordance suggesting it does.
- The **empty collection** renders as plain inline text, and the
  **syncing / ready / error** distinction is preserved unchanged.

**From "Toolbar layout":**

- The card grid and the toolbar share **one content column of the same width**.
  (The search bar itself is task 4; this task only has to keep the two columns
  agreeing.)
- The page still draws **no visible title**; the clipped `<h1>` stays as the
  landmark and focus-handoff target.

**From "Cross-cutting quality":**

- The grid is a **list to assistive technology**, with a heading structure that
  stays valid.
- Contrast meets AA in both themes for the card's surface, border, and every
  text tier on it; correct in both themes with no flash of the wrong theme; and
  correct at narrow, mid, and wide widths, including the collapse to one column.
- CI passes.

## Explicitly not satisfied here

- **The three-dot menu**, and everything under "Tag and reading-status
  interaction" — task 2.
- **Tags on the card**, including the reading-status tag. There are no tags
  until task 2 creates the tables.
- Everything under **"Schema"** and **"Writes and authorization"** — task 2.
  This task adds no migration and writes nothing.
- Everything under **"Filtering and search"** — tasks 3 and 4.
- The **"+" button and status indicator sitting against the search input's
  trailing edge** — task 4, which adds the input they align to.

## Exit state

A signed-in user opens `/lit-tracker` and sees their collection as a grid of
cards carrying the title, authors, year, and venue that #7's pipeline extracted
— the first time venue and year are visible anywhere on the site. The grid
becomes one column on a narrow window, the empty and still-syncing states are
still distinguishable, and nothing on a card responds to a click.
