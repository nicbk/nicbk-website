# Testing: GROBID Extraction Pipeline

What this task's tests must cover. Tiers and tooling are the feature's
([../../testing.md](../../testing.md)).

Fixtures are **hand-curated TEI-XML**, taken from or modelled on GROBID's own
repository samples — the decided approach, since the format is stable and
documented and no record-replay tooling is warranted.

## Unit (Vitest, MSW for in-process HTTP)

- **TEI parsing** (pure, the largest surface here): a realistic fixture yields
  the expected title, authors — including structured `given`/`family` where
  `persName` provides them, and `name` always populated — abstract,
  publication year, venue, DOI, and bibliography entries with their own
  titles/authors/years.
- **Degenerate fixtures** produce the decided fallbacks rather than throwing:
  no authors, no title, an empty bibliography, an author with only a raw
  string, and malformed XML. Each maps to a specific outcome — this is where
  "couldn't find authors" as a failure reason is actually decided.
- **Failure classification** (pure): a timeout or 5xx classifies as
  **transient** (retryable); an unparseable/corrupt document classifies as
  **terminal**. Getting this backwards is the failure mode the decided design
  warns about — an unparseable PDF retried forever, or a transient blip written
  as a permanent failure — so test it directly rather than through the handler.
- **Env schema:** `GROBID_URL` fails `parseEnv` when missing or malformed,
  parses when present, and is never `VITE_`-prefixed.

## Integration (Vitest + Testcontainers Postgres, GROBID stubbed in-process)

- **Extract stage, success:** creates the `articles` row with the
  **pre-allocated ID** (matching the object key), populates the parsed
  metadata, sets `extraction_status = 'grobid_only'`, and leaves reading status
  `pending`.
- **Extract stage, failure:** still creates the article row, with `title`
  falling back to the original filename and `authors` to `[]`, sets
  `extraction_status = 'failed'`, and writes `upload_jobs.status = 'failed'`
  with the reason string. Assert the article exists — this is the property #11
  depends on.
- **Terminal failures are not retried:** a stub returning an unparseable
  document results in exactly one attempt.
- **Transient failures are retried:** a stub failing twice then succeeding ends
  with a successful article and a job that never entered `'failed'`.
- **Finalize stage** deletes the `upload_jobs` row on success, so nothing
  lingers.
- **Proxied read:** the extract stage fetches the stored PDF back and gets
  byte-identical content; a read for another user's object is refused.
- **`pgboss` is not replicated:** pg-boss's tables exist after the queue starts
  and are absent from the publication Zero reads. Worth asserting once, here,
  where they first exist.

## End-to-end (Playwright, GROBID mocked via the mock-server container)

GROBID is mocked in e2e by pointing `GROBID_URL` at a WireMock/MockServer
container in the compose stack — a **config swap, not an interception
library** — because these calls originate server-side in a different container
from the test runner. The accepted consequence is stated plainly: **e2e never
exercises the real GROBID.**

- **Full round-trip, no reload:** submitting a fixture PDF closes the modal, a
  job row appears, and then — without any navigation or refresh — the row
  disappears and the article appears in the list with its extracted title and
  authors. This is the feature's headline behavior and the one test that proves
  the whole chain.
- **Failure path:** a stubbed unparseable response leaves a warning row with
  its reason, and the article row behind it exists (asserted through the UI or
  the query, whichever the surface exposes).
- **Multiple uploads** resolve independently — one failing does not hold up the
  others.
- Longer explicit timeouts for these async assertions, per the decided
  poll-for-the-UI-state approach; still retrying matchers, never sleeps.

## Accessibility

- Re-run the inline axe scan on the status popup in both themes now that it can
  contain a **failed** row — the warning state's contrast and its
  not-by-color-alone requirement are newly exercisable here.

## Framework caveats to carry

- Retrying matchers with generous timeouts for pipeline completion; no sleeps.
- Judge the suite with `npm run test:e2e:prod`.
- Wait for transitions to settle before any axe scan.

## Browser verification (manual, recorded in status.md)

- Upload **real** papers against a **real** GROBID container — the one place
  the real integration is exercised at all, given e2e mocks it. Check the
  extracted title, authors, abstract, year, and venue against the PDFs
  themselves rather than accepting whatever comes back.
- Watch a job resolve live in a second window.
- Upload a deliberately corrupt PDF and confirm the warning row names something
  a human can act on.
