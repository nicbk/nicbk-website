# Research: The Contents Fold

Written 2026-10-14, before the spec, against `main` at `bd0d719`.

## Traceability

- [../../research/requests/2026-10-14/collapsible-outline.md](../../research/requests/2026-10-14/collapsible-outline.md):
  the request. O1–O5 map to the acceptance criteria in
  [constraints-and-behavior.md](./constraints-and-behavior.md).
- [../a-paper-shows-its-contents/](../a-paper-shows-its-contents/description.md)
  (#29): the tab this changes. Its constraints carry over unchanged: the
  section in view is marked, the list keeps it in view, the list holds still
  under the pointer, and the rail has no page numbers.
- [../a-paper-opens-where-you-left-it/](../a-paper-opens-where-you-left-it/description.md)
  (#23): the model the user named. State is synced to the account, per paper,
  through a Zero mutator that checks ownership and leaves `updated_at` alone.
- `research/data-modeling/zero-schema-conventions.md`: column and migration
  conventions; the publication already carries `article_contents`.
- `research/accessibility/conformance-target.md` (WCAG 2.2 AA): the 24px
  target minimum binds the new control in the 143px rail.
- `research/accessibility/keyboard-and-focus-management.md`: Base UI provides
  the keyboard model where it has a component.

## 1. The flat list today

`contents-panel.tsx` renders `article_contents.entries`, a flat array with a
`depth` per entry, as one `<ol>` of buttons, indented by depth through
`--indent`. Nothing nests, so nothing can fold. `keepInView` finds the marked
row as `list.children[index]`, which only holds while the list is flat.

The #29 verification textbook (120 pages, a 252-entry, three-level outline) is
the case the user describes. Every row is visible at once.

## 2. The primitive: a disclosure, not a tree

- The WAI-ARIA Authoring Practices offer two patterns for nested, foldable
  navigation: the **tree view** and the **disclosure**.
- They recommend the disclosure for navigation. The tree role needs keyboard
  behaviour (arrow-key roving and type-ahead) that navigation does not use, and
  a navigation tree example is published as a comparison, not a template.
  Sources:
  - [APG navigation treeview example](https://w3.org/WAI/ARIA/apg/patterns/treeview/examples/treeview-navigation)
  - [its 1.2 note](https://www.w3.org/TR/2021/NOTE-wai-aria-practices-1.2-20211129/examples/treeview/treeview-navigation.html)
- The contents are navigation: each title is a button that moves the reader.
  A tree would also turn the jump into "activate a tree item", a second meaning
  on the key that folds.
- **Base UI's Collapsible** is the disclosure (`Root`, `Trigger` as a button
  with `aria-expanded`, `Panel`). It is installed (`@base-ui/react` ^1.6.0,
  `collapsible/`), and Base UI is the project's decided primitive library.
  Source: [base-ui.com, Collapsible](https://base-ui.com/react/components/collapsible).
  Its controlled `open`/`onOpenChange` lets the saved state drive it.
  Re-check its current API against the docs when implementing.

## 3. Where the folds are kept

- **On `article_contents`, as an `expanded` column**: the indices of the open
  entries, which is empty by default.
  - "Fully collapsed" is the column's default, so a first visit writes nothing.
  - The row is the list's own: it is read only on the paper's page. It is
    already in the publication and already scoped by `user_id`.
  - Indices are stable because entries are only ever replaced whole, never
    edited (#29). The one write that replaces them, the upload's
    `onConflictDoUpdate` in `extract-stage.ts`, resets the column in the same
    statement, so saved indices never point into a different list.
- **Not on `articles`**, where the reading place lives: the collection syncs
  every article row, and a paper's folds have no business there. #29 put the
  entries in their own table for the same reason.
- **Applied live**, unlike #23's reading place. #23 refuses to move an open
  reader because moving the page under someone is disruptive. A fold changed
  on another device changes only which rows show, and the mutator updates the
  local copy at once, so there is no delay to hide.
- **Written per press, as "open" or "closed" for one entry**, not as the whole
  set. Two devices folding different chapters both keep their change, and a
  repeated write is harmless.

## 4. Open questions for the user

See [plan.md](./plan.md#to-decide-with-the-user).
