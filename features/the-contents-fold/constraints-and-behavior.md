# Constraints and Behavior: The Contents Fold

## Behavior

### Folding

- **An entry with sections under it has a fold control**: a chevron at the
  start of its row, pointing right when closed and down when open.
  - **Its hit target is at least 24 × 24 px** (WCAG 2.2 AA), in the rail too.
  - Pressing it shows or hides the entry's sections, and nothing else.
- **The title is still a button that moves the reader**, as in #29. It neither
  opens nor closes the entry.
- **An entry with no sections has no control.** Its title lines up with its
  siblings' titles, so a level reads as one column whether or not each entry
  folds.
- **"Under" is by depth.** An entry's sections are the entries after it with a
  greater depth, up to the next entry at its depth or shallower. This is the
  flat list's own meaning, so a skipped level (depth 1, then 3) nests under the
  nearest shallower entry rather than being dropped.
- **Closing an entry hides everything beneath it.** Opening it shows its
  sections, each as folded as it was left.
- **No animation that delays the content.** A fold either shows its rows at
  once or uses a short height transition that is turned off under
  `prefers-reduced-motion`.

### The first visit

- **Every entry is closed**: only depth-1 entries show. This is the stored
  default, so nothing is written for a paper never folded. *(But see
  [plan.md](./plan.md#to-decide-with-the-user), question 1, on a lone root.)*

### The section in view

- **Still marked**, as #29 marks it. When it sits inside a closed entry, **the
  nearest shown entry above it is marked** instead: the closed chapter it
  belongs to. Nothing opens by itself, because the user's folds are theirs to
  set.
- **The list still keeps the marked row in view**, centred on first showing
  and nearest after that, and still holds still under the pointer.

### Keeping the folds

- **Per paper, on the account**, synced like the reading place (#23). The rail
  and the sheet show the same folds.
- **Saved on each press**, and shown at once, without waiting for the server.
- **A fold changed on another device shows here as it syncs.** It changes only
  which rows show, never the reader.
- **When a paper's contents are read again** and the entries are replaced, its
  folds reset to all closed.

## Constraints

- **Built on Base UI's Collapsible**, the disclosure pattern, not the ARIA tree
  role (research §2). It is controlled from the saved state.
- **Nested lists in the markup** (`<ol>` within `<li>`), so assistive technology
  hears the levels. The stored entries stay a flat array; the nesting is built
  when rendering.
- **The folds live in `article_contents.expanded`**: a `jsonb` array of entry
  indices, default `[]`, not null (research §3). Its migration follows
  `research/data-modeling/zero-schema-conventions.md`. The Zero schema is
  regenerated, not hand-edited.
- **One mutator, `articleContents.setExpanded({ articleId, index, open })`**:
  - ownership checked;
  - an anonymous caller refused;
  - an index outside the entries refused;
  - idempotent, with no `updated_at` bump.

  `articles.setReadingPosition` is the model.
- **The upload's rewrite resets `expanded`** in the same `onConflictDoUpdate`.
  The backfill never rewrites (`on conflict do nothing`), so it needs no
  change.
- **Uniform rows.** Rows that fold and rows that don't share height, padding and
  title alignment.

## Acceptance criteria

1. On a paper whose contents have never been opened, the tab shows only the
   top-level entries (O3).
2. Each entry with sections opens and closes from its own control, and its
   title still moves the reader to it (O1). The title does not fold.
3. On the 252-entry textbook, the first view is the chapters alone, and
   reaching a chapter's subsection takes two presses to open and one to jump
   (O2).
4. Folds made on a paper are there when it is reopened. That holds after a
   reload, in the other form of the sidebar (rail or sheet), and on a second
   browser signed in to the same account (O4, O5).
5. Folding one paper does not change another's.
6. When the section in view is inside a closed entry, that entry is marked. When
   it is open, the section itself is.
7. The fold control is at least 24 × 24 px, and the rail has one row per entry
   at 143px, in light and dark.
8. A keyboard user can reach and operate every control. The fold control
   announces whether its entry is expanded.
