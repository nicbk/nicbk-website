# Status: GROBID Extraction Pipeline

**State:** In progress — planning settled with the user, nothing implemented
yet. Fourth of five.

- Branch: `article-upload-and-extraction/grobid-extraction-pipeline`.
- Sub-issue: [#70](https://github.com/nicbk/nicbk-website/issues/70)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)).

## Decisions taken before implementation

- **GROBID runs the `-crf` image, not `-full`** — confirmed with the user
  (2026-08-08). The two differ more than the feature's "~4 GB RAM" note
  suggested: `0.9.1-full` is **~8 GB** on disk, wants ~4 GB resident and a GPU;
  `0.9.1-crf` is **~500 MB**, CPU-only, and costs **2–5 F1 points on
  citations/references** while header extraction (title, authors, abstract,
  year, venue, DOI) — this task's headline — is essentially unaffected. The
  accuracy that is given up lands in task 5's citation edges, where Semantic
  Scholar enrichment canonicalises entries anyway. nicbk-tower already carries
  Nextcloud, Collabora, Postgres, zero-cache, and Garage, which is what settled
  it. **Moving to `-full` later is a one-line image change**, so this is
  reversible if extraction quality disappoints in practice.
- **Consolidation is off** (`consolidateHeader=0`, `consolidateCitations=0`).
  Consolidation makes GROBID call **Crossref**, which
  [pdf-metadata-extraction.md](../../../../research/technologies/pdf-metadata-extraction.md)
  explicitly rejected for this collection: arXiv registers DOIs with DataCite,
  so Crossref is a known dead zone here. Enrichment is Semantic Scholar's job in
  task 5. `includeRawCitations=1` is on, for the bibliography.
- **`fast-xml-parser`** (5.10.1) for TEI. Zero-dependency, and the parsing is the
  largest and most testable surface in this task.
- **e2e stubs GROBID with an in-process server, not a WireMock container.**
  [testing.md](./testing.md) suggests WireMock/MockServer; the signed-in
  launcher already stubs Google's token endpoint the same way, and pointing
  `GROBID_URL` at a small local server is still the "config swap, not an
  interception library" that doc asks for. No new image, and a spec can choose
  the response per test.

## Findings that shape the implementation

- **GROBID 0.9.1 is current**, not the 0.9.0 most sources list.
- **Its status codes map onto the decided failure classification directly**,
  which is better than the spec assumed — classification reads real semantics
  rather than inferring from a timeout:
  - `200` — success.
  - **`204` — "no content could be extracted and structured" → terminal.** This
    is the precise signal for the decided "genuinely unparseable PDF".
  - `400` — malformed request. Terminal, but it means *this app* built a bad
    request; it must not be reported to the user as a bad PDF.
  - `500` — transient.
  - `503` — thread pool exhausted; GROBID's own docs recommend retrying after
    5–10s. Transient.
- **The endpoint is `POST /api/processFulltextDocument`**, `multipart/form-data`
  with the file under the field name **`input`**, on port **8070**.

## Carried in from task 3

- **pg-boss is already here.** Task 3 added it and enqueues `lit-tracker.extract`
  jobs transactionally (`src/lit-tracker/upload/queue.ts`,
  `store-upload.ts`). What this task adds is the **worker** that drains the
  queue. [description.md](./description.md) says this task "adds pg-boss as the
  job queue" — the same wording slip task 3's description had, and it needs the
  same correction.
- **The storage read path exists** (`getArticlePdf` in
  `src/storage/pdf-storage.ts`), ownership-checked, and is integration-tested
  against a real Garage. This task is its first real caller.
- **Unit coverage is ratcheted and the integration tier does not count toward
  it.** A task that is mostly job handlers will fight this, as task 3 did. The
  answer that worked: unit-test the *decisions* — sequence, fallbacks,
  terminal-vs-transient — with the infrastructure stubbed, and leave the
  integration tier to prove they hold against real services.

## Next

Compose service and the TEI parser first: parsing is the largest surface and is
pure, so it is where the tests concentrate.
