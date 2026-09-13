# Testing: Article Edit

Feature-wide tiers. Task specifics are in each task's own `testing.md`.

## Unit (Vitest, jsdom)

- **The mutators' validation is the real boundary.** A title of spaces, an empty
  author list, a year that is not a year — each refused by the mutator's schema,
  not only by the form. The form's messages are tested separately from the fact
  that they are true.
- **Ownership is checked on every new mutator**, in the same shape as the
  existing ones: another user's article id is refused before anything is written.
- **A blank optional field stores an absent value**, not `''` — one
  representation of "no venue", so nothing downstream has to decide whether the
  two mean different things. (`notes` deliberately goes the other way, and the
  reason is recorded on `setNotes`; this is not that case.)
- **The authors list edits as a list**: adding, removing and correcting one row
  leaves the others alone, and `given`/`family` survive a save that did not touch
  them.
- **The editing/non-editing rule**: a value arriving from sync while the modal is
  open does not overwrite a field the reader has changed; after a successful save
  the surface reflects live data again.
- **The confirmation gate**: the delete control does nothing until the typed text
  matches exactly, and the existing `matchesConfirmation` is reused rather than a
  second comparison written.
- **The failed-upload entry point** opens the modal for the right article, and a
  successful edit of a failed article retires its job row while leaving
  `extraction_status` alone.

## Integration (Testcontainers Postgres + Garage)

This feature is the first whose writes are *destructive*, so the integration tier
carries more than usual:

- **The cascade is real, not assumed.** Deleting an article through the real
  mutator against a real database removes its annotations, tag links, citation
  edges and `upload_jobs` row — asserted by querying for them afterwards.
- **Another user's rows are untouched** by a delete that names their id: the
  ownership check refuses and the transaction rolls back leaving nothing.
- **The PDF object is actually gone from Garage** after the cleanup job runs, and
  the cleanup is idempotent — running it twice on an already-deleted object is
  not an error, because a retry is a normal thing for a queue to do.
- **An edit writes only what it names**: `status`, `notes`, `extraction_status`
  and `pdf_object_key` are unchanged afterwards.

## Browser verification (record in each task's status.md — primary evidence)

Per [AGENTS.md](../../AGENTS.md), against the intent and not only the render:

- The modal opened from **both** entry points — the collection card and the
  detail page — since they mount the same menu but sit in very different layouts.
- **A realistic author list**, not the two-author case: seed a paper with a dozen
  authors and check the list holds at narrow, mid and wide widths, in both
  themes, scrolling the whole modal.
- **The failure case as the reader meets it**: an article whose title is a
  filename and whose author list is empty, which is the form's first real user.
- A correction appearing on the card, the detail page and in search **without a
  reload**.
- A delete removing the card immediately, and the PDF becoming unreachable
  afterwards.
- Console clean.

## Coverage

Ratchet applies (`node scripts/coverage-ratchet.mjs <current> <baseline>`).

## What this feature cannot prove

That the metadata is *correct* — only that the reader can make it so. Nothing
here validates a DOI against a registry or a venue against a list, and nothing
should: the whole point of this feature is that the human is the authority the
extractor was standing in for.
