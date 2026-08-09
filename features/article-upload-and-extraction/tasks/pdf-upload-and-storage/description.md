# Task: PDF Upload and Storage

Third of five. The upload half of the slice: a PDF gets from the user's disk
into Garage, and a live job row appears on screen.

## What this task does

- **Adds Garage** as a single-node Compose service with the standard S3 API,
  and a storage client in the app server configured from server-only
  environment (`GARAGE_ENDPOINT`, credentials, bucket).
- **Builds the proxied upload endpoint.** PDFs stream **through the app
  server** — authenticated, ownership-scoped — into
  `lit-tracker/{user_id}/{id}/source.pdf`. **No presigned Garage URL is ever
  issued**, and no URL is persisted; only the stable object key is. This keeps
  file access behind the same authorization as every other piece of user data.
- **Validates uploads server-side before anything is stored**: the declared
  content type must be `application/pdf` **and** the bytes must begin `%PDF-`
  (a declared type is attacker-controlled and not trusted on its own), with a
  per-file size cap and a per-submission file-count cap. A rejected file
  produces a clear inline error and stores nothing.
- **Creates the `upload_jobs` row** per file, inside the same transaction as
  the upload record, using the **pre-allocated-ID** design: the row's
  Postgres-generated `uuidv7()` `id` is the future article's ID, and the PDF is
  written under that ID immediately, so no blob ever has to be copied or moved
  once the article row exists.
- **Builds the upload modal**: the "+" button next to the search area opens a
  simple modal containing only a multi-select PDF file picker. **No metadata
  review or editing** — picking files and submitting is one action. On
  successful submission the modal closes immediately.
- **Builds the upload-status indicator and job-list popup**, driven by live
  `upload_jobs` rows through Zero: the three icon states (in-progress, the
  non-clickable checkmark with its "All articles synced" tooltip, and the
  warning state), and rows showing filename plus a progress indicator, or
  filename, a warning icon, and a failure reason.

## The exit state is honest about being intermediate

Nothing consumes `upload_jobs` yet — the pipeline arrives in task 4 — so a
submitted upload's row appears live in the popup and **stays there in
`processing`**. That is the correct intermediate state, not a defect: the
storage path is what the extract stage's input is, so it has to exist first, and
building the pipeline against a fixture from nowhere would mean rewriting its
entry point once real uploads arrived.

It is called out here so a reviewer is not surprised by it, and so nobody
"fixes" it by adding a fake resolution that task 4 would delete.

## Not in this task

GROBID, Semantic Scholar, and anything that reads a stored PDF back — tasks 4
and 5. The `articles` rows those stages create do not exist yet, so the
collection surface stays empty through this task.

**pg-boss is split across the boundary**, which an earlier draft of this
document got wrong by listing it here outright. Its *send* side belongs to this
task: [constraints-and-behavior.md](./constraints-and-behavior.md) requires the
job to be enqueued inside the same transaction as the `upload_jobs` write, and
that transaction is written here. What task 4 adds is the **handler** that
drains the queue. Deferring the enqueue would mean reopening and rewriting the
upload path later — the rework this feature's ordering exists to avoid.
