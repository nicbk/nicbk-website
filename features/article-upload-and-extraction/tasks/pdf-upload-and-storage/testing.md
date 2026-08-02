# Testing: PDF Upload and Storage

What this task's tests must cover. Tiers and tooling are the feature's
([../../testing.md](../../testing.md)).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Upload validation** (pure): each rejection reason is distinguishable — a
  non-`application/pdf` content type, bytes not beginning `%PDF-` (including
  the case of a file *declared* as PDF that is not one, which is the reason the
  magic-byte check exists), an oversized file, and an over-count submission. A
  valid PDF passes.
- **Object-key construction** (pure): produces
  `lit-tracker/{user_id}/{id}/source.pdf` exactly, `user_id` segment first, and
  is stable for the same inputs.
- **Env schema:** the new Garage variables fail `parseEnv` with clear
  per-variable errors when missing or malformed, parse when present, and are
  never `VITE_`-prefixed.
- **Upload modal** renders a multi-select file picker; submitting invokes the
  upload handler with every selected file and closes the modal; a rejection
  renders an **inline error**, not a toast; focus is trapped and restored and
  the modal is keyboard-dismissible.
- **Status indicator** renders each of the three states from injected job data:
  in-progress (clickable, opens the popup), the **non-clickable** checkmark
  exposing the "All articles synced" tooltip, and the warning state. The states
  are distinguishable **without color** — assert on the accessible name or
  text, not only the icon.
- **Job-list popup** renders one row per job with filename plus progress for
  in-progress rows, and filename, warning icon, and reason for failed ones;
  multiple failures render as multiple flat rows.

## Integration (Vitest + Testcontainers Postgres)

- **Garage round-trip:** a PDF written through the storage client reads back
  byte-identical under the expected key. Run against a real object store (a
  Garage container, or the same S3 API surface) — the point is a real store,
  not a mocked client.
- **Ownership on read:** a read for an object whose key belongs to another user
  is refused by the app server's path, not merely absent.
- **Upload transaction:** a committed upload leaves exactly one `upload_jobs`
  row **and** one enqueued pg-boss job; a rolled-back one leaves neither. This
  is the transactional-send guarantee, and it is only meaningful if tested by
  forcing a rollback.
- **Rejected uploads store nothing:** a file failing validation leaves no
  object in Garage and no `upload_jobs` row — verified by looking, not inferred
  from the error response.
- **Pre-allocated ID:** the object key contains the `upload_jobs.id` value, so
  the article created in task 4 can adopt that same ID with no blob move.

## End-to-end (Playwright)

- **Upload round-trip:** with an injected session, clicking "+" opens the
  modal, `setInputFiles()` selects one or more fixture PDFs, submitting closes
  the modal immediately, and **live job rows appear in the popup without a
  reload**. Asserted with retrying matchers.
- **Multi-file:** submitting several PDFs in one action produces one row per
  file.
- **Rejection:** a non-PDF file is refused with an inline error and no row
  appears.
- **Icon states:** the checkmark state is not clickable and exposes its
  tooltip; the in-progress state opens the popup.
- **Theming and widths:** the modal and popup are correct in both themes and at
  narrow, mid, and wide widths.

## Accessibility

- `@axe-core/playwright` runs inline on the **open upload modal** and the
  **open status popup**, in both themes, blocking on critical/serious findings.
  Wait for both surfaces to finish animating first — a scan taken mid-fade
  measures a blend that is never a resting state.
- The "+" button and the status indicator are icon-only and must carry
  discernible accessible names; the indicator's state must not be conveyed by
  color alone; both are keyboard operable.

## Framework caveats to carry

- Route every new interaction through the `e2e/fixtures.ts` retry helpers; the
  measured hydration race applies to the "+" button and the file input alike.
- Retrying matchers for anything that waits on a synced diff — never a sleep.
- Judge the suite with `npm run test:e2e:prod`.

## Browser verification (manual, recorded in status.md)

- Upload real PDFs of varying size, in both themes, at three widths, driving
  the modal by keyboard as well as pointer.
- Confirm the job rows appear live with a second browser window open on the
  same account — the reactivity requirement is "live updated across all live
  clients", and one window cannot demonstrate it.
- Confirm rejections show inline and leave nothing behind in Garage.
