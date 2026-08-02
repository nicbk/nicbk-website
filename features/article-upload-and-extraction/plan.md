# Plan: Article Upload and Extraction

## Approach

Build **outward from the reactivity foundation, then along the pipeline in the
direction data actually flows**: stand up Zero and prove user-scoped sync
server-side before any page exists → give it a page so reactivity is visible in
a browser → put a PDF in blob storage and a job row on screen → make the job
resolve with GROBID → add Semantic Scholar enrichment and the citation edges on
top of a pipeline that already works end to end.

Each stage is independently testable and mergeable behind its own PR + CI +
human review before the next begins.

The ordering is not arbitrary. Every stage after the first is a **consumer of
the one before it**, so a defect surfaces in the task that introduced it rather
than three PRs later: the header consumes Zero's live query; the upload
endpoint consumes the header's page and writes the row the status indicator
reads; the GROBID stage consumes the stored PDF and resolves that row; the
enrich stage inserts itself into a pipeline that is already green.

## Task breakdown and sequence

Tasks are sequential — one open at a time, each gated by its own PR + CI +
human review.

1. **[`zero-sync-foundation`](./tasks/zero-sync-foundation/description.md)** —
   Zero bring-up, **no UI**. Add the `zero-cache` service to
   `docker-compose.yml` with its own `ZERO_UPSTREAM_DB`/`ZERO_CVR_DB`/
   `ZERO_CHANGE_DB` connections and SQLite replica; declare the `articles` and
   `upload_jobs` tables in Drizzle and migrate them; generate `zero/schema.ts`
   via `drizzle-zero` under the same CI drift check the auth schema uses;
   implement the app server's `/query` and `/mutate` endpoints, deriving the
   user context from the Better Auth session and scoping every synced query by
   `user_id`. Exit state: integration tests prove a user's query returns only
   that user's rows and that another user's rows are unreachable — no page
   renders any of it yet.

2. **[`lit-tracker-shell`](./tasks/lit-tracker-shell/description.md)** — The
   `/lit-tracker` route group behind `requireAuth` (its **first live
   attachment**), the lit-tracker header as a fixed app shell (app name, root
   breadcrumb segment, avatar wired to the existing user-settings modal — also
   its first live trigger), and a minimal collection surface: the Zero client
   provider plus one live `useQuery` over `articles`, rendering the empty-state
   text or a plain list. Exit state: a signed-in user reaches the page, a
   signed-out one is redirected to `/sign-in`, and a row inserted directly into
   Postgres appears on screen without a refresh.

3. **[`pdf-upload-and-storage`](./tasks/pdf-upload-and-storage/description.md)**
   — Garage as a Compose service and an S3 client; the proxied upload endpoint
   (authenticated, ownership-scoped, size/count/type-validated, streaming to
   `lit-tracker/{user_id}/{id}/source.pdf`); the upload modal (multi-select file
   picker, closes on submit); and the upload-status indicator with its three
   icon states and job-list popup, driven by live `upload_jobs` rows. Exit
   state: submitting PDFs stores them in Garage and puts live rows in the popup.
   **Those rows stay in `processing`** — nothing consumes them until task 4.

4. **[`grobid-extraction-pipeline`](./tasks/grobid-extraction-pipeline/description.md)**
   — pg-boss and the GROBID container; the extract stage (fetch the PDF from
   Garage, POST to GROBID, parse TEI into title/authors/abstract/year/venue/DOI,
   always create the `articles` row with best-effort fallbacks) and the finalize
   stage (delete the resolved `upload_jobs` row). Terminal failure handling for
   a genuinely unparseable PDF writes `status = 'failed'` with a reason and
   leaves the warning row standing. Exit state: a real PDF becomes a real
   article with `extraction_status = 'grobid_only'`, live, and the job row
   disappears.

5. **[`semantic-scholar-enrichment`](./tasks/semantic-scholar-enrichment/description.md)**
   — The enrich stage inserted between extract and finalize: match the article
   against Semantic Scholar, populate `semantic_scholar_id` and any metadata
   GROBID missed, promote `extraction_status` to `'enriched'`, and write the
   `citation_edges` rows for the parsed bibliography — resolving each against
   this user's existing articles by S2 `paperId`, falling back to normalized
   title + first author. Enrichment failure is **non-fatal**: the article keeps
   its `grobid_only` status and the job still finalizes. Adds the
   `citation_edges` migration.

## Sequencing rationale

- **Zero first, and alone**, because it is the largest, most cross-cutting
  piece and the one whose failure mode is worst: `/query` is where every
  authorization decision for user data on this site is made, so it is worth
  isolating in its own reviewable task and proving against a real Postgres
  before any page depends on it. This mirrors #6's backend-first shape, which
  worked for the same reason.
- **A page second, immediately**, because task 1 deliberately has nothing to
  look at, and this project's guidance requires verifying features in a browser
  rather than trusting tests. Task 2 is the smallest thing that makes Zero's
  reactivity observable, and it doubles as the first live consumer of #6's
  route guard and settings modal — closing a loop that feature left open.
- **Storage before the pipeline**, because the extract stage's input is a
  stored PDF. Building the pipeline first would mean feeding it a fixture from
  nowhere and rewriting its entry point once real uploads arrived.
- **GROBID before Semantic Scholar**, because `grobid_only` is already a
  legitimate terminal outcome in the decided schema, not a stub: task 4 ships a
  complete, working pipeline, and task 5 inserts a stage into a chain that is
  already green. It also keeps a self-hosted container and a rate-limited
  external API in separate reviews.
- **Citation edges last**, with enrichment, because their matching logic is
  written against resolved Semantic Scholar IDs — the edges and the enrichment
  that makes them meaningful are one concern, not two.

## What this feature deliberately does not introduce

- **The full collection view** — card grid, user-defined tags, reading-status
  filter sidebar, live search, infinite scroll. That is #8, which upgrades the
  minimal surface task 2 leaves rather than replacing it.
- **The PDF reader and annotations** (#9), **citation-graph traversal UI**
  (#10 — this feature writes edges, it does not render them), and **article
  edit** (#11). #11's absence is why a failed upload's warning row cannot yet
  be cleared; see [description.md](./description.md).
- **Client-side Zero mutators.** Nothing in this feature is written from the
  browser: uploads go through a proxied REST endpoint because a PDF binary is
  not a mutator payload, and every other write is made server-side by a job
  handler. `/mutate` is stood up as a real endpoint with an empty mutator
  registry so the seam exists and is authorized correctly; #8's reading-status
  and tag writes are its first real consumers. This is the same
  build-the-seam-not-a-throwaway-consumer call #6 made for the route guard.
- **A second Postgres instance for Zero.** `ZERO_CVR_DB` and `ZERO_CHANGE_DB`
  are separate *databases* within the one shared Postgres service, not a new
  service — the shared-infrastructure constraint in
  [DESIGN.md](../../high-level-guidance/design/DESIGN.md) still holds.
