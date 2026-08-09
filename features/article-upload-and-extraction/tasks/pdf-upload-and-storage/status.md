# Status: PDF Upload and Storage

**State:** Implemented, awaiting PR. Third of five.

- Branch: `article-upload-and-extraction/pdf-upload-and-storage`.
- Sub-issue: [#69](https://github.com/nicbk/nicbk-website/issues/69)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)).

## Notes carried into implementation

- **Never issue a presigned Garage URL.** Every PDF read and write is proxied
  through the app server's own authorization
  ([pdf-and-annotation-data-protection.md](../../../../research/security-privacy/pdf-and-annotation-data-protection.md)).
- **The batch is the unit of validation.** A submission carrying one bad file
  stores none of it, so "a rejected file leaves nothing behind" holds for the
  set and not merely for the file.
- **The exit state is intermediate on purpose.** Nothing drains the queue until
  task 4, so a submitted upload stays in `processing`. Do not "fix" that with a
  fake resolution.

## What was built

- **Garage** as a Compose service (`dxflrs/garage:v2.3.0`), plus a one-shot
  `garage-init` job that makes it usable and exits — the same shape as the
  existing `migrate` job, and gating the app the same way.
- **`src/storage/`** — the object-key rules (`lit-tracker/{user_id}/{id}/source.pdf`,
  owner segment first) and the S3 client, with an ownership check on every read.
- **`src/lit-tracker/upload/`** — pure validation (four distinguishable
  rejections), the transactional store step, the queue, and the endpoint's
  behaviour as a plain `Request → Response` function.
- **`/api/lit-tracker/upload`** — session-scoped, streaming, the one write on
  this site that is not a Zero mutation.
- **The collection toolbar** — the "+" button and the three-state upload status
  indicator, with the job-list popup driven by live `upload_jobs` rows.

## Decisions taken during implementation

- **The upload is REST, not a Zero mutation** — raised by the user as a direct
  question, and worth recording because it is not obvious. Zero's mutation
  arguments are JSON (`zero-protocol/src/push.d.ts`), so a PDF would have to be
  base64-encoded, and zero-cache rejects socket messages above
  `websocketMaxPayloadBytes` — **10 MB by default**, against a 50 MB file limit.
  Mutations are also persisted client-side and replayed until acknowledged, and
  ordered per client group, so one upload would sit in browser storage and
  head-of-line block every other write. The split is therefore permanent:
  **bytes in over REST, state out over Zero.**
- **The Garage bootstrap speaks the admin API over HTTP, from the app image.**
  A fresh node has no cluster layout and answers no S3 request until one is
  applied — assign, apply, import the key, create the bucket, grant access. The
  official image is `scratch` plus one static binary, so there is no shell to run
  a script *inside* it, and driving the CLI from outside would need either a
  second image carrying the binary or a bind-mounted Docker socket. The admin API
  needs nothing but `fetch`, which the app image already has.
- **The bootstrap is idempotent by checking, not by catching.** Garage's admin
  API answers 409 for an existing key and `BucketAlreadyExists` for an existing
  bucket. Since the job re-runs on every `up`, each step probes first — swallowing
  those errors instead would also swallow a real one.
- **`ImportKey`, not `CreateKey`.** The app reads its credentials from `.env`; a
  generated key would have to be read back out of Garage and written into the
  environment before the app could start.
- **The ordering inside an upload is the design.** Allocate the id → write the
  PDF → record and enqueue in one transaction. A crash between the write and the
  commit leaves an orphan object, which is garbage; the opposite order would
  leave a job whose PDF does not exist, which the extract stage could only
  discover by failing.
- **The queue is injected, not reached for.** `storeUpload` takes the queue the
  way it already took the database handle. pg-boss holds connections and an
  installed schema, and the integration tier drops and recreates its database
  between tests, so a module-level singleton could not be pointed at it. It also
  keeps the endpoint's unit tests free of a queue entirely.
- **`GARAGE_ACCESS_KEY_ID`'s shape is validated in `src/env.ts`.** Garage fixes
  it as `GK` followed by hex and rejects anything else at import time; checking
  here turns a placeholder or a truncated paste into a named startup error rather
  than an `InvalidAccessKeyId` on someone's first upload.
- **The toolbar's controls sit at the row's end for now.** The decided layout
  puts them beside the search bar, and search is #8 — so until it lands they are
  at the edge rather than floating in the middle of an empty row. **#8 moves them
  back beside the field**, agreed with the user; that is a change to
  `collection-toolbar.module.css`, not to its structure.
- **The synced checkmark is `role="img"` with a label, not a live region.** What
  it conveys is a standing fact, not an event, and a `role="status"` here both
  announced itself unprompted and collided with the collection's own loading
  status while the first sync was in flight.
- **A failure outranks work in progress** in the indicator. A broken upload needs
  the user, and further uploads finishing does not make that less true.

## What the tests found

- **jsdom's `FormData` drops filenames.** The endpoint's tests exercise real
  multipart parsing, and under the unit tier's jsdom every part came back as
  `"blob"` — passing or failing against an implementation that never runs in
  production. That file is pinned to the node environment with a docblock.
- **Testcontainers' default wait strategy cannot start Garage.** It probes ports
  with a shell command *inside* the container, and the image has no shell, so it
  timed out while Garage was in fact listening. Both the integration helper and
  the e2e launcher wait on the log line instead.
- **Garage's `/health` answers 503 until a layout is applied**, which makes it a
  good assertion that the bootstrap actually worked rather than a startup gate.
- **The ordinary e2e tier broke on the new environment variables.** All 61 of its
  tests failed on a server that refused to start, because `src/env.ts` validates
  at startup and `playwright.config.ts` had no Garage placeholders. Nothing in
  that suite uploads — the fix is placeholders, and the failure was loud, which
  is the behaviour that env schema is for.

## Browser verification

Against the real Compose stack, signed in, both themes:

- Two PDFs submitted in one action landed in Garage under
  `lit-tracker/{user_id}/{id}/source.pdf`, and the 109 KB one read back
  **byte-identical** to the file on disk. The modal closed at once and both job
  rows appeared in the popup with filename and progress.
- A third upload appeared in the already-open popup without a reload.
- A **non-PDF was refused inline** — filename in bold, the reason beneath it, the
  modal still open — and left nothing in Postgres or Garage.
- **The live path was proven from outside the browser**: marking a job `failed`
  with `psql` turned the indicator red and rewrote that row with its reason,
  while the other two kept extracting, with no interaction at all. That is the
  same write-origin the extract stage will have in task 4.
- Dark theme and a narrow window: popup and modal both within the viewport, no
  horizontal overflow.

**One thing worth knowing for anyone testing this later.** A second *tab* cannot
demonstrate multi-client sync. Zero drops the sync connection for a hidden
document, and two tabs of one window are never both visible — the second tab
sat on its loading placeholder and logged "unable to connect for 60 seconds",
which looks exactly like a defect and is not one. Its `document.visibilityState`
was `hidden` throughout. This is why
[testing.md](./testing.md) says a second **window**. The external-write check
above exercises the same propagation and does not need one.

## Deployment prerequisites

The host needs five new values in `/var/lib/nicbk-website/.env` before this
merges — `GARAGE_ACCESS_KEY_ID`, `GARAGE_SECRET_ACCESS_KEY`, `GARAGE_BUCKET`,
`GARAGE_RPC_SECRET`, `GARAGE_ADMIN_TOKEN` — plus `GARAGE_ENDPOINT`. Compose
interpolates them with `:?`, so a missing one stops the deploy's build with a
named error rather than starting anything. See the README for the generation
commands; the key id must be `GK` followed by hex.

Not application code, and still outstanding from the feature's notes:
**LUKS on the Garage partition before real PDFs are stored**, and backup
coverage extended to the Garage volume — this is the first data on the site that
cannot be rebuilt from the repository.
