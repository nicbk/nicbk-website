# Plan: Article Edit

**Three tasks**, each gated by its own PR + CI + human review, each shippable and
demoable on its own.

## Why three, and why in this order

The feature has one surface and two verbs, and the verbs have nothing in common
underneath: correcting a row is a form and a validating mutator; removing one is
a confirmation, a cascade and a blob. Splitting them keeps the destructive half
from riding in behind the safe half's review.

The third is the loop nobody can close today. It needs the modal to exist before
it can point at it, which is what puts it last rather than first.

## Task 1 — [`editing-an-articles-details`](./tasks/editing-an-articles-details/description.md)

The modal and the write behind it.

- An `articles.update` mutator taking title, authors, year, venue and DOI;
  required fields enforced in its schema; ownership checked like every other
  write.
- The modal itself: real labels, inline validation, the editing/non-editing rule,
  focus returned to the trigger.
- The authors list — one row per author, add and remove, `given`/`family` left as
  found.
- "edit…" added to the existing three-dot popover, so it arrives on the card and
  the detail page together.

**Delivers:** a wrong title can be fixed, and the fix is everywhere at once.

## Task 2 — [`deleting-an-article`](./tasks/deleting-an-article/description.md)

The destructive half, including the bytes.

- "delete…" in the same popover, opening the exact-text-match confirmation reused
  from delete-account.
- An `articles.delete` mutator with the same ownership check, relying on the
  database's cascades for annotations, tag links, citation edges and the upload
  job.
- A delete in `pdf-storage.ts`, and a pg-boss cleanup job that calls it — enqueued
  by the server half of the mutation, never by the browser's copy.

**Delivers:** an article uploaded by mistake can be removed completely.

## Task 3 — [`resolving-a-failed-upload`](./tasks/resolving-a-failed-upload/description.md)

The dead end gets its exit.

- A failed row in the upload-status popup becomes an entry point into task 1's
  modal, opened on what is missing.
- A successful edit of a failed article retires its `upload_jobs` row, so the
  header's warning clears — the half the cascade does not do for us.
- `extraction_status` is left alone, on purpose and with the reason recorded.

**Delivers:** the warning icon over a failed upload can finally be answered, by
fixing the article or by deleting it.

## Risks, named up front

- **The blob outlives the row.** pg-boss sends on its own connection, so the
  enqueue is not in the transaction that deleted the row: a crash in that window
  orphans an object. Task 2 decides deliberately between accepting the window
  (with the precedent the extraction pipeline already sets) and recording the
  intent transactionally — and says which, rather than leaving it to be
  discovered.
- **The client copy of a mutator must not reach storage.** Every mutator in this
  project runs in the browser too. The one that deletes an article is the first
  whose consequences are not all in Postgres, which makes it the first that can
  be got wrong in a way the type system will not catch.
- **A modal bound to reactive data.** The editing/non-editing rule exists because
  a concurrent sync can otherwise overwrite what someone is typing. This is the
  first form on the site with more than one field bound this way; #9's notes
  field is one textarea and a debounce, which is not the same problem.
- **Twelve authors, not two.** The layout that looks right against a two-author
  paper is the layout that breaks against a real one. The author list is where
  this feature's design risk actually lives.
- **A required field that arrives empty.** Every failed extraction produces an
  article with `authors: []`, so the modal's first real user is a row that does
  not satisfy its own validation rules. The form has to be honest about that
  without shouting at someone who has not typed anything yet.
