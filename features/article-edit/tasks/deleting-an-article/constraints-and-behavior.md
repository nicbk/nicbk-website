# Constraints and Behavior: Deleting an Article

The destructive half of
[the feature's criteria](../../constraints-and-behavior.md).

## Satisfied here

- **An article can be deleted from the three-dot menu**, behind a typed
  exact-text confirmation that must match before the control does anything.
- **The card leaves the grid immediately**, because the row delete is a mutator
  and Zero applies it optimistically.
- **Everything that belonged to the article goes with it**: annotations, tag
  links, citation edges, and the `upload_jobs` row — which is also what clears a
  failed upload's warning.
- **The PDF object is deleted from Garage**, server-side, after the row is gone.
- **A refused delete leaves everything standing**, including the confirmation the
  reader typed, so a failure is retryable without re-typing.

## Must not regress

- The menu's existing controls, and task 1's "edit…" beside this one.
- Every other user's data: a delete naming an id that is not the session's
  refuses before it writes.
- The upload/extraction pipeline, which keeps its own reasons for writing
  `upload_jobs` rows; this only ever removes one by removing the article.
- `pdf-storage.ts`'s existing upload and read paths — this adds an operation
  beside them.

## Constraints particular to this task

- **The client copy of the mutator must not reach storage.** Every mutator here
  runs twice, and this is the first whose consequences are not all in Postgres.
  The blob work is enqueued by the server half only, and nothing in the shared
  mutator module may import the storage client — that module is imported by the
  browser bundle.
- **The window between commit and enqueue is decided on purpose.** pg-boss sends
  on its own connection, so the enqueue is not inside the transaction that
  deleted the row: a crash in between orphans an object. Either accept it, with
  the precedent `extract-stage.ts` already sets and a sentence saying so, or
  record the intent transactionally and drain it. **Whichever is chosen is
  written down in the status file** — the failure this task must not ship is the
  one nobody decided about.
- **The cleanup is idempotent**, because a queue will run it twice. Deleting an
  absent object is success.
- **The confirmation is the existing one.** `matchesConfirmation` and the phase
  machine from `delete-account.tsx`; a second exact-match comparison is a second
  thing to get subtly different.
- **What the reader types to confirm is the article's title.** It is the thing on
  screen that identifies the paper, and for a failed extraction it is the
  filename — which is exactly what that reader recognises.
- **Deletion is authorized like everything else**, through `ownership.ts`, in the
  transaction that performs it.

## Cross-cutting

- WCAG 2.2 AA: the confirmation field has a real label and an accessible
  description saying what deleting does; the confirm control is `aria-disabled`
  rather than `disabled` so it stays findable and announces that it is
  unavailable; focus behaviour matches the account-deletion flow readers have
  already met.
- The destructive control is visually separated from the everyday ones, as the
  account modal separates its own — never one stray click from "edit…".
- No schema change; one new storage operation and one new queue.
- CI green: Biome, typecheck, unit + integration with ratchet coverage, PR-title
  lint.
