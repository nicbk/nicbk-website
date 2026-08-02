# Constraints and Behavior: PDF Upload and Storage

Which of the feature's acceptance criteria
([../../constraints-and-behavior.md](../../constraints-and-behavior.md)) this
task satisfies.

## Satisfied here

**From "Sync engine and services":**

- **Garage** exists as a single-node Compose service with the standard S3 API,
  pinned to a version tag.
- The new Garage variables are declared in `src/env.ts`, documented in
  `.env.example`, and are server-only.

**From "Authorization and data isolation":**

- **PDF writes are proxied through the app server.** No presigned or signed
  Garage URL is issued to any client; no URL is persisted — only the stable
  object key.

**From "Upload flow" — all of it:**

- The **"+" button** opens a simple modal containing only a **multi-select**
  PDF file picker.
- **No metadata review or editing** before saving; picking and submitting is a
  single action.
- The modal **closes immediately** on successful submission.
- Uploads are validated server-side: `application/pdf` **plus** a `%PDF-`
  magic-byte check, a per-file size cap, and a per-submission count cap. A
  rejected file produces a clear inline error and stores nothing.
- The object key is `lit-tracker/{user_id}/{id}/source.pdf`, with the `user_id`
  segment first.

Reading status **`pending`** is satisfied structurally — `articles.status`
defaults to `'pending'` (task 1's migration) and this task creates no article
rows. The first article created in task 4 inherits it.

**From "Upload status indicator" — all of it except resolution:**

- The three **icon states** render correctly, including the non-clickable
  checkmark with its "All articles synced" tooltip.
- **Job-list rows** show filename plus a progress indicator for an in-progress
  job, and filename, a warning icon, and a short failure reason for a failed
  one. Multiple failures are multiple rows — no grouping or summary.
- The list updates **live** as `upload_jobs` rows change, with no refresh.

**From "Extraction pipeline" — one item:**

- The job is enqueued **inside the same Postgres transaction** as the write
  recording the upload, so a committed upload always has an enqueued job and a
  rolled-back one has none. (The pg-boss handler that consumes it is task 4;
  the transactional-send seam is established here because that is where the
  upload transaction lives.)

**From "Cross-cutting quality":**

- WCAG 2.2 AA on the new controls: discernible accessible names on the
  icon-only "+" button and status indicator; the indicator's three states
  distinguishable by **more than color alone**; the modal traps and restores
  focus and is keyboard-dismissible; the popup is keyboard-reachable; contrast
  and focus visible in both themes.
- Correct in both themes and at narrow, mid, and wide widths.
- CI passes.

## Explicitly not satisfied here

- **The row lifecycle's resolution half.** Rows appear and update live, but
  nothing resolves them yet — the deletion-on-resolve behavior is task 4's
  finalize stage. Submitted jobs stay in `processing`; see
  [description.md](./description.md).
- **Everything under "Extraction pipeline"** beyond the transactional enqueue —
  tasks 4 and 5.
- **Reading a stored PDF back.** The download/proxy-read path is built by task
  4, which is the first thing that needs it.

## Exit state

A signed-in user clicks "+", selects one or more PDFs, and submits. The modal
closes at once, the PDFs are in Garage under their pre-allocated article IDs,
and a live row per file appears in the status popup — visible without a
refresh, in both themes, at every width. A non-PDF, an oversized file, or an
over-count submission is refused with a clear inline error and stores nothing.
