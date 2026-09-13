# Task: Deleting an Article

**Task 2 of 3.** The destructive half, including the bytes.

## What it does

- **Adds "delete…" to the same three-dot popover**, opening the exact-text-match
  confirmation the decided interface asks for — the pattern that already guards
  account deletion, reused rather than re-derived, including its confirm control
  that is inert but still reachable.
- **Adds an `articles.delete` mutator** with the same ownership check as every
  other write, relying on the database's own cascades for annotations, tag links,
  citation edges and the `upload_jobs` row rather than deleting each by hand.
- **Adds a delete to `pdf-storage.ts`**, which has never needed one, and a
  pg-boss cleanup job that calls it — enqueued by the *server* half of the
  mutation, because the same mutator also runs in the browser and a browser has
  no business reaching object storage.
- **Makes the cleanup idempotent.** A queue retries; deleting an object that is
  already gone is a success, not an error.

## What it does not do

- **No undo, and no soft delete.** The project's schema conventions decided hard
  deletes, and a confirmation the reader had to type is the friction that buys
  it.
- **No bulk delete.** One article, from a menu about one article.
- **Nothing to `citation_edges` by hand.** The cascade already does the right
  thing, and reference editing is #10's.
- **No change to the reader or the PDF proxy.** They stop having an article to
  serve, which is the whole point.

## Exit state

A paper uploaded by mistake can be removed, deliberately, and is actually gone —
row, annotations, tag links, job row and the PDF in Garage.
