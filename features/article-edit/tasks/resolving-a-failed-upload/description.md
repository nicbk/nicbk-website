# Task: Resolving a Failed Upload

**Task 3 of 3.** The dead end gets its exit.

## What it does

- **Makes a failed row in the upload-status popup an entry point** into task 1's
  modal, for the article that row is about — the second entry point the decided
  interface has always named, and the one nobody could build until the modal
  existed.
- **Opens the modal on what is missing**, so a reader arriving from a warning
  lands on the problem rather than hunting for it.
- **Retires the `upload_jobs` row when a failed article is successfully edited**,
  which is what clears the header's warning. The cascade already covers the
  delete half; this is the half nothing does for us.
- **Leaves `extraction_status` exactly as it is**, and says why in the code: the
  column remembers what extraction achieved, which a human correction does not
  change. The job row is what said the upload needed the user, and that is what
  stops being true.

## What it does not do

- **No new modal, no second edit path.** It points at task 1's.
- **No change to how extraction reports failure.** `recordOutcome` keeps writing
  exactly what it writes; this is about what happens afterwards.
- **No history.** The popup keeps listing only jobs still needing attention, as
  decided — a resolved row disappears rather than turning into a record of having
  been fixed.
- **No automatic retry** of extraction. The manual path is the path.

## Exit state

The warning icon over a failed upload can finally be answered: click it, fix the
title and authors the extractor could not find, and the warning clears — or
delete the article, and it clears that way. Nothing in the tracker is left
permanently flagged with a problem that has already been solved.
