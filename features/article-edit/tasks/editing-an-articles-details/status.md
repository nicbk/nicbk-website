# Status: Editing an Article's Details

**State:** Implemented, awaiting review. Task 1 of 3.

- Branch: `article-edit/editing-an-articles-details`, from `main` at `1d2646b`.
- Sub-issue: [**#141**](https://github.com/nicbk/nicbk-website/issues/141).
- PR: [**#145**](https://github.com/nicbk/nicbk-website/pull/145).

## Why this task exists

Nothing in the app could change what GROBID wrote. One wrong title is wrong on
the card, on the detail page, in search, and — once #10 arrives — in every
reference match.

## What shipped

- **`articles.updateDetails`** — title, authors, year, venue and DOI, with the
  rules in its own schema rather than only in the form: a trimmed non-empty
  title, at least one named author, a four-digit year or nothing, and blank
  optional fields stored as `null`. Ownership checked like every other write.
- **`article-draft.ts`** — the form's three exact questions as pure functions
  (row → fields, fields → mutation, what is wrong in between), plus the author
  list arithmetic. Asserted directly, without React.
- **The dialog**, with the authors list, inline validation, and a save that
  stays open on a refusal.
- **"edit…" on the existing three-dot popover**, which put it on the card and
  the detail page at once.
- **`useMutationReporter`**, split out of `useMutationRunner`: the same write
  with its answer handed back instead of turned into a toast. Every existing
  caller is unchanged — the runner is now the reporter plus the toast.

## Open items, settled

- **The form holds a snapshot**, taken once per mount, rather than tracking
  per-field dirtiness. One writer, one save button; the cost — a concurrent
  change the reader never saw is overwritten — is stated on `draftFrom`.
- **Validation appears on save, not on arrival.** A failed extraction opens this
  form already invalid, and greeting a reader with two errors for a machine's
  mistake is scolding them for it.
- **The dialog is the popover's sibling, not its child**, so the popover closing
  on the way in cannot unmount the form. That is also why the dialog is told
  where to send focus afterwards: the button that opened it no longer exists.

## Browser verification — 2026-09-12, Chrome, local Compose stack

Seeded two articles to test against realistic content, and deleted both by id
afterwards: a fourteen-author paper with a very long title, and a failed
extraction (filename title, `authors: []`, `extraction_status: 'failed'`).

- **Both entry points** open the same form: the collection card and the detail
  page's menu beside the reader.
- **Fourteen authors**, light and dark, at 500px and 1440px: the author list
  scrolls inside the form, each row named for whom it removes. Tab order runs
  title → (name, remove) × 14 → add author → year → venue → DOI → save → cancel.
- **A correction lands everywhere without a reload** — removing an author and
  setting a venue redrew the card behind the modal, and the database showed 13
  authors with `status`, `extraction_status` and `pdf_object_key` untouched.
- **The failed-extraction article** opened on its filename title with one empty
  author row and no errors shouting; saving without an author was refused inline;
  filling in a real title and author fixed the card.
- **Enter submits** from a text field.
- Console carries only the pre-existing `data-theme` hydration mismatch, present
  identically with this branch stashed.

## What the browser found, and what changed because of it

- **"save" fell below the fold** on a 1440x900 desktop window with fourteen
  authors, because the whole modal scrolled. The fields now scroll inside a
  pinned action row, so the primary control is on screen at any height.
- **The title field opened showing its end.** Focusing an input leaves the caret
  after the last character, which for a paper title scrolls the field to the
  final few words. It now collapses the selection to the start before focusing.

## What a test found, and what changed because of it

**Reopening the form showed the draft abandoned last time**, error message and
all. The snapshot was being taken in the dialog's own `onOpenChange`, which
never runs on the way *in*: the menu sets its own `open` flag. The form's state
now lives in a component that only exists while the popup does, so one visit is
one mount. Two cases lock it in — a re-opened form is fresh, and so are its
validation messages.

## Log

- 2026-09-12 — Filed with the feature.
- 2026-09-12 — Implemented, unit + integration + browser verified, PR opened.
