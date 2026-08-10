# Task: PDF Serving

**Second of five.** The bytes.

Every PDF the tracker has ingested has been sitting in Garage since #7, and
nothing has ever read one back. This task builds the route that does: a
signed-in, ownership-checked, same-origin GET that streams an article's PDF
through this app server.

It has **no UI at all**, and that is the point. The reader's authorization is
the half of it that carries a real security requirement, and the reader's
rendering is the half that carries a real unknown. Reviewed together, the
security half would be the smaller diff in a pull request full of WebAssembly.
Separated, this task is verifiable by opening a URL.

## What it does

- **A route that streams one article's PDF.** Session required, ownership
  checked against the article row, object fetched from Garage by the row's
  `pdf_object_key`, streamed back as `application/pdf`.
- **Uses what already exists.** `getArticlePdf` in `src/storage/pdf-storage.ts`
  and `isOwnedBy` in `src/storage/object-key.ts` were written for this caller
  and have never had one. The module's own header already states the rule this
  task implements.
- **No presigned URL.** Not as an optimization, not as a fallback. The decided
  data-protection rule
  ([pdf-and-annotation-data-protection.md](../../../../research/security-privacy/pdf-and-annotation-data-protection.md))
  is that a presigned URL grants access to whoever holds it, independent of this
  server's checks, and this project's scale gains nothing from the bandwidth
  offload that justifies them elsewhere.
- **One response for "not yours" and "not there".** Distinguishing them turns
  the route into an oracle for which article ids exist.
- **Streams rather than buffers.** A PDF is megabytes; the response should not
  require holding the whole file in the server's memory per request. `putArticlePdf`
  takes bytes for a documented reason — the magic-byte check and the size cap —
  and the read path has no such reason.

## What it does not do

- **No viewer, no EmbedPDF, no component.** Task 3.
- **No download UI.** Nothing decided specifies a visible download control, so
  none is added. This route exists to feed the reader.
- **No range requests / partial content**, unless the reader turns out to need
  them — in which case that is a finding for task 3 to bring back here, not
  speculative work now.
- **No caching headers beyond what correctness requires.** A private,
  per-user document is not something to hand a shared cache without deciding to.

## Exit state

A signed-in user can open their own article's PDF at a URL and see the paper in
the browser's own viewer; another user asking for the same URL gets exactly what
they would get for an article that does not exist. Proven against a real Garage
container in the integration tier.
