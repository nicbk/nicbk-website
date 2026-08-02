# Status: PDF Upload and Storage

**State:** Not started. Third of five; depends on `lit-tracker-shell`.

- Branch: `article-upload-and-extraction/pdf-upload-and-storage` (to be
  created).
- Sub-issue: [#69](https://github.com/nicbk/nicbk-website/issues/69)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)),
  unassigned — self-assign before starting.
- PR: —

## Notes carried into implementation

- **Never issue a presigned Garage URL**, and never persist a URL — only the
  stable object key. Every read and write goes through the app server's own
  authorization. This is a decided security property, not a convenience choice.
- **Do not trust the declared content type.** `application/pdf` plus a `%PDF-`
  magic-byte check; the declared type is attacker-controlled.
- **Upload limits are configuration**: 50 MB per file, 20 files per submission,
  proposed at spec time and easy to change. Put them somewhere a reviewer can
  see and adjust, not scattered through the handler.
- **The pre-allocated-ID design is the whole point of `upload_jobs.id`** — the
  PDF is written under the *future* article's ID so no blob is ever copied or
  moved. Do not invent a temporary key and a rename.
- **Enqueue inside the upload transaction** via pg-boss's transactional send
  and its Drizzle adapter. The handler is task 4, but the seam belongs here.
- **The exit state is intentionally intermediate**: submitted jobs stay in
  `processing` because nothing consumes them until task 4. Do not add a fake
  resolution.
- **MinIO is archived — reach for Garage.** Training instinct will suggest
  MinIO; the decided answer is Garage, and the S3 client is generic anyway.
- **Verify in the browser before the PR**, including a second window on the
  same account: "live updated across all live clients" cannot be demonstrated
  with one window.

## Log

- 2026-08-01 — Task defined during the feature spec. Third of five; not yet
  started.
