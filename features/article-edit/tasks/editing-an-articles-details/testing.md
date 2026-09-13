# Testing: Editing an Article's Details

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest, jsdom)

**The mutator**

- Accepts a well-formed edit and writes exactly the named columns.
- Refuses an empty title, a whitespace-only title, and an empty author list.
- Refuses an author whose `name` is blank, rather than storing a nameless entry.
- Stores `null` — not `''` — for a blanked venue, DOI or year.
- Refuses another user's article id, writing nothing.
- Is safe to run twice with the same arguments (the rebase property every mutator
  in this project holds).
- Leaves `status`, `notes`, `extraction_status` and `pdf_object_key` untouched.

**The modal**

- Opens from the menu, is named by its heading, and returns focus to the trigger
  on close.
- Saves the whole form in one mutation.
- Shows a required-field message inline, associated with the field, and does not
  show it before the reader has tried to save.
- Opens cleanly on an article with a filename title and no authors — the failed
  extraction case — without shouting at a reader who has typed nothing.
- Adds and removes author rows; removing the second of three leaves the first and
  third as they were.
- Preserves `given`/`family` on an author whose name was not edited.
- Holds the editing/non-editing rule: a sync update arriving for this article
  while the modal is open does not overwrite a changed field, and the surface
  reflects live data again after a successful save.
- Surfaces a rejected write inline rather than as a toast.

**The menu**

- Still offers reading status and tags, unchanged, with "edit…" added.
- Each author row's remove control is named for the author it removes.

## Integration (Testcontainers Postgres)

- An edit through the real mutator against a real database changes the five
  columns and no others — asserted by reading the row back, not by trusting the
  call.
- The ownership refusal leaves the target row byte-for-byte as it was.

## Browser verification (record in status.md — primary evidence)

- Both entry points: the collection card and the detail page.
- A twelve-author paper, at narrow / mid / wide, in both themes, scrolling the
  whole modal — the author list is this task's real design risk.
- A long title, since the modal sits over a card that already truncates one.
- A correction appearing on the card and the detail page without a reload.
- The failed-extraction article (filename title, no authors) opened and fixed.
- Keyboard only: open, move through every field and author row, save, and land
  back on the trigger.
- Console clean.

## Coverage

Ratchet applies. The mutator and the authors-list logic are pure and entirely
testable; the modal's behaviour is testable through the real component, as
`user-settings.test.tsx` already does for a dialog.
