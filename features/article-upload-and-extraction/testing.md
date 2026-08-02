# Testing: Article Upload and Extraction

Testing requirements for the feature as a whole, per the decided testing tiers
(see [research.md](./research.md) for citations). Each task's `testing.md`
states the concrete tests that task must add.

## Tiers in play, and what is new

All four existing tiers apply — unit, integration (Testcontainers Postgres, the
tier #6 introduced), e2e (Playwright), and inline accessibility (axe). What is
new here is **what the integration tier has to prove**: this is the first
feature with user-owned data, so "user B cannot see user A's rows" is an
integration-level correctness requirement, not a code-review observation.

**External-service stubbing** follows
[mocking-external-services.md](../../research/testing-qa/mocking-external-services.md),
and this feature is the case that doc was mostly written for:

- **Unit tests** use **MSW** for in-process HTTP (a GROBID or Semantic Scholar
  call made by code under direct test).
- **E2E** mocks **both GROBID and Semantic Scholar** via a mock-server
  container (WireMock/MockServer) in the compose stack, with `GROBID_URL` /
  `SEMANTIC_SCHOLAR_URL` pointed at it — because those calls originate
  **server-side, in a different container from the test runner**, which is
  exactly why neither MSW nor Playwright's `page.route()` can reach them. The
  accepted tradeoff is explicit: **e2e never exercises the real GROBID**, and
  that coverage gap is accepted rather than hidden.
- **Fixtures are hand-curated** — GROBID's TEI-XML output is stable and its
  repository ships real samples; Semantic Scholar's JSON is simple enough to
  hand-author. No record-replay tooling.
- **Auth** is by injected session (`storageState`) throughout; nothing here
  re-tests the login flow.

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Env schema:** each new variable (`ZERO_*`, `GARAGE_*`, `GROBID_URL`,
  `SEMANTIC_SCHOLAR_URL`) fails `parseEnv` with a clear per-variable error when
  missing or malformed, parses when present, and is never `VITE_`-prefixed.
  `SEMANTIC_SCHOLAR_API_KEY` parses when **absent** — it is optional.
- **TEI parsing** (pure): a GROBID TEI-XML fixture yields the expected title,
  authors (including structured `given`/`family` when `persName` is present),
  abstract, year, venue, DOI, and bibliography entries. Degenerate fixtures —
  no authors, no title, an empty bibliography, malformed XML — produce the
  decided fallbacks rather than throwing.
- **Citation matching** (pure): S2-`paperId` match wins when both sides have
  one; the normalized title + first-author fallback applies **only** when
  neither side has an ID; a title differing by case or surrounding whitespace
  still matches; a genuinely different paper does not.
- **Object-key construction** (pure): produces
  `lit-tracker/{user_id}/{id}/source.pdf` exactly, with the `user_id` segment
  first.
- **Upload validation** (pure): a non-PDF content type, a file whose bytes do
  not begin `%PDF-`, an oversized file, and an over-count submission are each
  rejected with the specific reason; a valid PDF passes.
- **Upload modal** renders a multi-select file picker, submits, and closes;
  focus is trapped and restored; it is keyboard-dismissible.
- **Status indicator** renders each of the three icon states from injected job
  data — in-progress, the non-clickable checkmark with its "All articles
  synced" tooltip, and the warning state — and the popup's rows show filename,
  progress, and a failure reason where applicable.
- **Lit-tracker header** renders the app name as a link to the tracker root,
  the root breadcrumb segment, and an avatar with a discernible accessible name
  that opens the settings modal.

## Integration (Vitest + Testcontainers Postgres)

- **Migrations** apply cleanly to a fresh database, producing `articles`,
  `upload_jobs`, and `citation_edges` with their indexes, the generated
  `authors_search` column, and the `pg_trgm` extension.
- **User isolation — the load-bearing test.** With two users' rows present, the
  `/query` handler returns only the requesting user's; arguments naming another
  user's `user_id` or row IDs return nothing; a request with no valid session
  is refused. This must be verified **non-vacuously** — with rows genuinely
  present for the other user, so a handler that returned nothing at all would
  fail it.
- **Account-deletion cascade:** deleting a `user` removes that user's
  `articles`, `upload_jobs`, and `citation_edges`. This closes the gap #6
  recorded explicitly — its deletion test could only cover identity rows
  because no user-owned tables existed yet.
- **`ON DELETE SET NULL` on `cited_article_id`:** deleting a cited article
  reverts its edges to unresolved placeholders rather than deleting the citing
  article's bibliography.
- **Transactional enqueue:** a rolled-back upload transaction leaves no
  enqueued pg-boss job, and a committed one always has exactly one.
- **Pipeline stages** against real Postgres with GROBID and Semantic Scholar
  stubbed in-process: the extract stage creates the article row on success
  **and** on failure (with the decided fallbacks); a terminal failure writes
  `status = 'failed'` plus a reason and does not retry; a stubbed Semantic
  Scholar outage leaves the article `grobid_only` and the job still finalizes;
  the finalize stage deletes the `upload_jobs` row.
- **Citation-edge graduation in both directions:** an edge inserted for a paper
  already in the collection resolves immediately, and uploading an article that
  a previously-unresolved edge referenced graduates that existing edge.
- **Garage round-trip:** a PDF written through the storage client reads back
  byte-identical, and a read for an object the requesting user does not own is
  refused. (Run against a Garage container, or the same S3 API surface —
  whichever the task establishes; the point is a real object store, not a
  mocked client.)

## End-to-end (Playwright)

- **Route guard:** a signed-out visit to `/lit-tracker` lands on `/sign-in`
  carrying the requested URL, with no interstitial; with an injected session it
  renders the tracker. This is the guard's first live coverage.
- **Upload round-trip** against the full stack with GROBID and Semantic Scholar
  stubbed: submitting one or more PDFs closes the modal immediately, job rows
  appear in the status popup, and — **without a page reload** — the rows
  disappear and the articles appear as the stubbed pipeline completes. The
  no-reload part is the point: it is the only test that proves Zero's live sync
  end to end.
- **Failure path:** a stubbed unparseable PDF leaves a warning row naming the
  reason, and the article row behind it exists.
- **Icon states:** the checkmark state is not clickable and exposes the "All
  articles synced" tooltip; the in-progress and warning states open the popup.
- **Upload rejection:** a non-PDF file is refused with an inline error and
  nothing is stored.
- **Settings modal** opens from the header avatar — its first live trigger.
- **Theming and widths:** the app-shell layout is correct in both themes and at
  narrow, mid, and wide widths, with panels scrolling independently and no
  flash of the wrong theme.

## Accessibility

- `@axe-core/playwright` runs inline on `/lit-tracker`, on the open upload
  modal, and on the open status popup, in **both themes**, blocking on
  critical/serious findings.
- Icon-only controls (the "+" button, the status indicator, the avatar) have
  discernible accessible names; the status indicator's three states are
  distinguishable by **more than color alone**; the modal traps and restores
  focus and is keyboard-dismissible; the popup is keyboard-reachable; contrast
  and focus indicators meet AA in both themes.

## Coverage / gating

- Vitest `v8` coverage, ratchet-style (must not drop PR-over-PR), per
  [test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md).
  The integration tier participates in the same gate.
- The `zero/schema.ts` drift check runs in CI: a Drizzle schema change without
  regenerating the Zero projection fails the build.

## Framework caveats to carry

- The **TanStack Start + Playwright hydration race** is now measured and has a
  named remedy: assert the end state and retry the interaction, using the
  `e2e/fixtures.ts` helpers rather than bare `click()`/`fill()`. See the
  2026-08-01 addendum in
  [e2e-testing.md](../../research/testing-qa/e2e-testing.md). Every new control
  here — the "+" button, the status indicator, the file picker — is subject to
  it.
- **`npm run test:e2e` locally is not the suite CI runs.** Judge the suite with
  `npm run test:e2e:prod`; the same addendum explains why.
- **CSS transitions are a second flakiness source** — a one-shot read (axe
  scan, `evaluate`, screenshot) taken while a transition is playing measures a
  blend that is never a resting state. Wait for the popup and modal to settle
  before scanning.
- **Zero adds a third timing class**: an assertion may now run before a synced
  diff has arrived. Use retrying matchers (`expect(locator).toHaveText`) and
  never a fixed sleep — this is the DOM-assertion pattern
  [e2e-testing.md](../../research/testing-qa/e2e-testing.md) decided on
  precisely so no WebSocket-level waiting is needed.
