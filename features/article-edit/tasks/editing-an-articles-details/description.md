# Task: Editing an Article's Details

**Task 1 of 3.** The modal, and the write behind it.

## What it does

- **Adds an `articles.update` mutator** taking title, authors, publication year,
  venue and DOI. Title and authors are required *in its schema*; the optional
  three accept an absent value and store one. Ownership is checked through
  `requireOwnedArticle`, like every other write on this site, and the mutator is
  safe to re-run because it writes whole values rather than patches.
- **Adds "edit…" to the existing three-dot popover**, which lands it on the
  collection card and on the detail page at once, because both mount the same
  `ArticleMenu`.
- **Builds the modal** decided in
  [article-edit.md](../../../../research/ui-ux/pages/lit-tracker/components/article-edit.md):
  centered, named by its heading, focus trapped while open and returned to the
  trigger on close — the behaviour `UserSettings` already gets from Base UI's
  `Dialog`, reused rather than rebuilt.
- **Edits authors as a list**, one row per author with add and remove. A row
  carries `name`; `given`/`family` are preserved untouched on any author the
  reader did not edit.
- **Holds the editing/non-editing rule**: while the modal is open, live updates
  to this article do not overwrite what is being typed. A successful save closes
  it and returns the surface to reflecting live data.
- **Shows failures inline**, next to the field that caused them — not as a toast,
  which is for writes with no form to attach to.

## What it does not do

- **No delete.** That is task 2, and the whole reason the two are separate PRs.
- **No reference editing.** Deferred to #10 with the surface that displays
  references.
- **No new entry point.** The status popup's failed row is task 3; this task adds
  one item to a menu that already exists in both places it is needed.
- **Nothing to `extraction_status`, `status`, `notes` or `pdf_object_key`.** The
  mutator names the columns it writes and writes no others.

## Exit state

A reader who sees a wrong title opens the menu they already use for tags, fixes
it, and watches it change on the card behind the modal. An author the extractor
invented can be removed in one click.
