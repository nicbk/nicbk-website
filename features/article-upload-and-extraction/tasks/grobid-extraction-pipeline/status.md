# Status: GROBID Extraction Pipeline

**State:** Implemented; [PR #77](https://github.com/nicbk/nicbk-website/pull/77)
open, awaiting CI and review. Fourth of five.

- Branch: `article-upload-and-extraction/grobid-extraction-pipeline`.
- Sub-issue: [#70](https://github.com/nicbk/nicbk-website/issues/70)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)).

## Decisions taken before implementation

- **GROBID runs the `-crf` image, not `-full`** — confirmed with the user
  (2026-08-08). The two differ more than the feature's "~4 GB RAM" note
  suggested: `0.9.1-full` is **~14.8 GB** on disk (measured on Docker Hub, more
  than the ~8 GB the planning note estimated) and wants a GPU; `0.9.1-crf` is
  **~510 MB**, CPU-only, and costs **2–5 F1 points on citations/references**
  while header extraction — this task's headline — is essentially unaffected.
  The accuracy given up lands in task 5's citation edges, where Semantic Scholar
  canonicalises entries anyway. nicbk-tower already carries Nextcloud,
  Collabora, Postgres, zero-cache, and Garage, which is what settled it.
  **Moving to `-full` later is a one-line image change.**
- **Consolidation is off** (`consolidateHeader=0`, `consolidateCitations=0`).
  Consolidation makes GROBID call **Crossref**, which
  [pdf-metadata-extraction.md](../../../../research/technologies/pdf-metadata-extraction.md)
  explicitly rejected for this collection: arXiv registers DOIs with DataCite,
  so Crossref is a known dead zone here. `includeRawCitations=1` is on, for the
  bibliography. Note that `consolidateHeader` defaults to **1**, so this is an
  explicit choice on every request rather than a default.
- **`fast-xml-parser`** (5.10.1) for TEI. Its `XMLValidator` is what makes a
  truncated response a failure rather than an article with mysteriously missing
  fields. (The planning note called it zero-dependency; that was true of v4 —
  5.10.1 has six small transitive dependencies.)
- **e2e stubs GROBID with an in-process server, not a WireMock container.** See
  the dated revisions in [testing.md](./testing.md) and
  [mocking-external-services.md](../../../../research/testing-qa/mocking-external-services.md).

## What the implementation found

### GROBID's status codes do not mean what its documentation says

The single most important finding, because the plan recorded before
implementation had it **backwards in the direction that matters**. The
documented mapping is 200 success / 204 nothing extractable / 500 internal
error / 503 overloaded, and the plan classified 500 as transient on that basis.

Measured against `grobid/grobid:0.9.1-crf`, every `GrobidException` — including
the ones meaning "this file is not a usable PDF" — is caught by one handler that
answers **500 with the exception's message as the body**
([`GrobidRestProcessFiles.java`](https://github.com/kermitt2/grobid/blob/master/grobid-service/src/main/java/org/grobid/service/process/GrobidRestProcessFiles.java)):

- a truncated or non-PDF file → `500 [BAD_INPUT_DATA] PDF to XML conversion
  failed with error code: 1`
- a structurally valid PDF with no text → `500 [NO_BLOCKS] PDF parsing resulted
  in empty content`

Both are terminal, and both look exactly like the transient 500 a restarting
container gives. Classifying on the status alone would have **retried every
corrupt upload until its retries ran out** — precisely the failure mode
[background-jobs.md](../../../../research/system-architecture/background-jobs.md)
warns about. 204 turned out to be nearly unreachable in practice.

So `grobid.ts` reads the body too: GROBID prefixes those messages with a member
of its own `GrobidExceptionStatus` enum, and the members describing *the
document* (`BAD_INPUT_DATA`, `PDFALTO_CONVERSION_FAILURE`, `NO_BLOCKS`,
`TOO_MANY_BLOCKS`, `TOO_MANY_TOKENS`, `PARSING_ERROR`, `TAGGING_ERROR`) are
terminal, while the rest — `TIMEOUT`, `GENERAL`, an unrecognised body, a 503 —
are not.

### Venue often does not survive with consolidation off

Verified against a real PLOS ONE paper: GROBID recovered the title, all twelve
authors, the abstract, the year and the DOI exactly, and emitted a `<monogr>`
carrying **only an imprint date** — no journal title at all. The null venue is
GROBID's output, not a parser gap.

This is an accepted consequence of the no-Crossref stance rather than a defect:
consolidation is what usually fills the journal name in, and Semantic Scholar
enrichment in task 5 is where venue can be recovered instead. Worth carrying
into that task.

## Decisions taken during implementation

- **Terminal and transient are a type, not a convention.** A terminal outcome
  throws `ExtractionFailedError` carrying the reason the user sees; anything
  else propagates and pg-boss retries it. Transient is the default deliberately:
  an unrecognised error is far more likely to be infrastructure than a bad
  document, and a wrongly-retried job still resolves in the end while a wrongly
  terminal one is simply lost. See `extraction/failure.ts`.
- **A dead-letter queue resolves a job whose retries are exhausted**, so
  "transient" cannot mean "forever". Without it a GROBID down for longer than
  the backoff covers would leave a row spinning in `processing` with no article
  behind it — the one state the status popup offers the user no way out of. The
  reason it writes names the service, not the file.
- **A title *and* authors are both required.** `upload_jobs-schema.md` gives
  authors as the example of "required data" and leaves the rest open. An article
  titled with its filename is not a usable record, and #11 exists to fix exactly
  that, so a missing title fails the job too — with its own reason, so the user
  is told which.
- **The article insert is an upsert.** A crash between the commit and pg-boss
  recording the job complete replays the whole stage. Only the extracted fields
  are overwritten; reading status and notes belong to the user.
- **The worker runs in the app server's process**, per
  [service-topology.md](../../../../research/system-architecture/service-topology.md),
  started from `src/server.ts` and **not awaited** — a database that is not up
  yet must not stop the site serving pages that do not need one. It retries with
  backoff instead of giving up, because a worker that quietly stopped after one
  failed connection looks exactly like a working one until an upload never
  resolves.
- **`getQueue()` no longer caches a failed start.** It cached the promise,
  including a rejected one, so a momentary Postgres blip would have poisoned the
  module for the life of the process and the retry loop above could never have
  reconnected. A latent bug from task 3, found by needing the retry.
- **The queue module moved to `lit-tracker/jobs/`.** Both the upload path (which
  sends) and the extraction worker (which drains) need it and neither owns it; a
  copy in each would be two definitions of one queue name.
- **`startQueue` describes the queues rather than creating them.** `createQueue`
  ignores the options of a queue that already exists, so a database carrying
  `lit-tracker.extract` from an earlier version would silently keep that
  version's retry policy. It is re-applied with `updateQueue`.

## What the tests found

- **The `Uint8Array` → `Blob` type error is real, not pedantry.** `BlobPart`
  requires a view over an `ArrayBuffer`, and `Uint8Array` is typed over
  `ArrayBufferLike`, which admits `SharedArrayBuffer`. Re-wrapping is the fix;
  a cast would have hidden it.
- **Task 3's e2e specs assumed nothing resolved a job.** With the worker live,
  every row they counted disappears a second later. They now upload PDFs that
  tell the stub it has no capacity, so the job is retried with the production
  backoff — which outlives any test — and the row stays put for a genuine
  reason. The one that reached the warning state with `psql` uses the real
  pipeline now.
- **Cleanup had to widen.** A resolved upload leaves an article, and a failed
  one leaves an article *and* a warning row; `deleteUploadJobsOf` became
  `clearUploadsOf`, which removes both.
- **Coverage rose rather than fell** — 85.91% → 88.98% — because the stages'
  decisions are unit-testable with the infrastructure stubbed, which is the
  lesson task 3 recorded. The gap that did appear was the worker's retry loop,
  covered with fake timers rather than left at 27%.

## Browser verification

Against the real Compose stack, signed in, with a **real GROBID container** and
real papers — the one place the real integration is exercised at all.

- **"Attention Is All You Need"** (arXiv, 2.2 MB): title exact, **10 authors**
  with `given`/`family` split, full abstract, `grobid_only`, reading status
  `pending`. Year came back 2023 rather than 2017 — GROBID read the arXiv
  revision date stamped on the PDF, which is what the document says.
- **A PLOS ONE paper** (1.3 MB): checked field by field against the DOI's own
  record. Title exact, **12 authors** (the record has 12), first author exact,
  year 2017, DOI `10.1371/journal.pone.0173664` exact, abstract correct. Venue
  null — see the finding above.
- **A corrupt PDF** in the same submission failed while the other two succeeded:
  a warning row reading **"couldn't read this PDF"** next to the filename, with
  its article present behind it, titled with the filename and showing "unknown
  author".
- **A blank-page PDF** produced **"no text found in this PDF"** — the `NO_BLOCKS`
  path, confirming the body-reading classification against the real service.
- **Watched live, with the popup open and no interaction:** a row showing
  "extracting…" with its progress bar disappeared and its article took its place
  in the list. The write originates in the worker, so this is the whole reactive
  path end to end.
- `pgboss.job` afterwards: every extract job `completed` with **`retry_count`
  0** — the terminal failures really did run once.
- Article ids match their object keys, so no blob was moved or copied.
- Dark theme and 400/768/1512 px: popup within the viewport, no horizontal
  overflow, warning text legible in both themes.

## Deployment prerequisites

`GROBID_URL=http://grobid:8070` must be added to `/var/lib/nicbk-website/.env`
on the host before the next deploy — `src/env.ts` validates it at startup, so
the app will refuse to start without it. Not a secret; it is the Compose service
address, and the port is never published.

The **six `GARAGE_*` values from task 3 are still outstanding** and still block
the deploy, along with LUKS on the Garage partition and backup coverage for its
volume.

## Next

Task 5, `semantic-scholar-enrichment` ([#71](https://github.com/nicbk/nicbk-website/issues/71)):
it inserts an `enrich` stage between the two that exist here, by changing what
the extract stage sends. The bibliography is already parsed and tested; nothing
persists it yet.
