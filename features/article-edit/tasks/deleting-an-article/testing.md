# Testing: Deleting an Article

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest, jsdom)

**The mutator**

- Deletes the article it names.
- Refuses another user's article id and writes nothing.
- Is safe to run twice: deleting an already-deleted row is not an error, because
  a rebase will re-run it.
- Does not import the storage client — asserted structurally, because this is the
  constraint that the type system will not catch and that ships as a broken
  browser bundle.

**The confirmation**

- The delete control does nothing until the typed text matches the title exactly.
- A near miss (wrong case, trailing character) does not enable it.
- `matchesConfirmation` is the function doing the comparison, not a second copy.
- A refused or failed delete leaves the typed text in place, so retrying is one
  click.

**The cleanup job**

- Deletes the object for the article it names.
- Succeeds when the object is already gone (the retry case).
- Is registered on its own queue, with the same shape as the pipeline's existing
  jobs.

## Integration (Testcontainers Postgres + Garage)

This is where this task's real evidence lives — cascades and blobs are exactly
what a mocked test cannot prove.

- Deleting an article with annotations, tags, citation edges and an `upload_jobs`
  row removes all of them, asserted by querying each table afterwards.
- A second user's article, annotations and tags are still there.
- An ownership refusal rolls back: the target row and everything hanging off it
  survive unchanged.
- The PDF object is gone from Garage after the cleanup runs, and running the
  cleanup again is still a success.

## Browser verification (record in status.md — primary evidence)

- Delete from the collection card: the confirmation, the typed title, the card
  leaving the grid.
- Delete from the detail page, where the reader is *on* the thing being deleted —
  what happens next must not be a broken page.
- A failed upload deleted this way: the header's warning icon clears.
- The PDF is unreachable afterwards (the proxy has no article to authorize).
- The destructive control is visibly separated from "edit…".
- Keyboard only, including the inert-but-reachable confirm button.
- Console clean.

## Coverage

Ratchet applies. The mutator, the cleanup job and the confirmation gate are all
small and directly testable; the integration tier carries the parts that are only
true against a real database and a real bucket.
