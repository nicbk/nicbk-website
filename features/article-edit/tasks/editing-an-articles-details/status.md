# Status: Editing an Article's Details

**State:** Not started. Task 1 of 3.

- Branch: `article-edit/editing-an-articles-details`, from `main` at `ed65c9f`
  or later.
- Sub-issue: [**#141**](https://github.com/nicbk/nicbk-website/issues/141).
- PR: opened once the unit tier and the browser pass are both clean.

## Why this task exists

Nothing in the app can change what GROBID wrote. One wrong title is wrong on the
card, on the detail page, in search, and — once #10 arrives — in every reference
match. This is the task that makes the reader the authority the extractor was
standing in for.

## Open items to settle while writing

- **How the form holds its editing state.** The decided rule is that live updates
  do not reach fields being edited, but #9's notes textarea is the only
  precedent on the site and it is one field with a debounce, not a form with
  five. Whether the modal snapshots the article on open or tracks per-field
  dirtiness is an implementation choice with a real difference: a snapshot is
  simpler and also discards a concurrent change the reader never saw.
- **What "required" looks like before anyone has typed.** Every failed
  extraction opens this modal with an empty author list, so the first real user
  is already invalid. Validation on submit is the assumption; if that reads badly
  in the browser, say so and change it there rather than here.
- **Where the modal lives in the tree.** The menu is a popover on a card inside a
  grid; a dialog rendered inside it inherits the popover's lifetime, which is not
  obviously what should close the form. Worth deciding deliberately rather than
  by whichever nesting compiles.

## Log

- 2026-09-12 — Filed with the feature.
