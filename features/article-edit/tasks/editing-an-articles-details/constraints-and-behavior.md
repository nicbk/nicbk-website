# Constraints and Behavior: Editing an Article's Details

The editing half of [the feature's criteria](../../constraints-and-behavior.md).
What follows is what that means for the code.

## Satisfied here

- **Title, authors, year, venue and DOI are editable and save together**, in one
  mutation rather than one per field. A modal with a save button is a
  transaction's worth of intent.
- **Required is enforced twice, and meant once**: the form says so before the
  reader submits, and the mutator refuses regardless. A title of only whitespace
  is not a title.
- **Optional fields clear to absent.** Blanking the venue stores `null`, not
  `''`, so every reader of the column has one question to ask.
- **The authors list is editable as a list** — add, remove, correct — and a save
  preserves `given`/`family` on rows the reader did not touch.
- **Opening the modal enters editing state**; incoming sync for this article is
  held off the fields until it closes.
- **The menu keeps working.** Reading status and tags behave exactly as before,
  in the same popover, with no change to their keyboard model.

## Must not regress

- `ArticleMenu`'s existing contents and its `details` slot, which the detail page
  depends on to show what the paper is.
- `setStatus` and `setNotes`, and `requireOwnedArticle`.
- The collection card's layout — the menu gains an item, the card gains nothing.

## Constraints particular to this task

- **The mutator is the authority.** Zod schema on the arguments: a trimmed
  non-empty title, at least one author with a non-empty name, a publication year
  that is a plausible year or absent, venue and DOI optional. The form may be
  friendlier; it may not be the only thing that is strict.
- **Authors are replaced wholesale, not patched.** The column is one `jsonb`
  value; sending the whole list is what a diff would compute anyway for a single
  editor, and it is what makes the mutator safe to re-run on rebase — the same
  reasoning already recorded on `setNotes`.
- **The modal must survive its first real user**, which is an article with a
  filename for a title and `authors: []`. An empty required field on open is
  ordinary here: say what is needed when they try to save, not before they have
  typed anything.
- **Twelve authors is the design case.** The list scrolls inside the modal rather
  than growing it past the viewport, and the save and cancel controls stay
  reachable without hunting for them.
- **Reuse, don't re-derive.** Base UI's `Dialog` for the modal behaviour and the
  existing `useArticleMutations` refusal path for a rejected write; a second
  implementation of either is a second thing to keep in step.

## Cross-cutting

- WCAG 2.2 AA: every field has a real `<label>`; validation messages are
  associated with their field and announced; each author row's remove control is
  named individually ("Remove Ashish Vaswani", not twelve buttons called
  "Remove"); the dialog is named by its title and returns focus to its trigger;
  targets meet 44px.
- Responsive: narrow, mid and wide, in both themes, with a long title and a long
  author list.
- No schema change, no new route.
- CI green: Biome, typecheck, unit + integration with ratchet coverage, PR-title
  lint.
