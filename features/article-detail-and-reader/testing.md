# Testing: Article Detail and Reader

Testing requirements for the feature as a whole, per the decided testing tiers
(see [research.md](./research.md) for citations). Each task's `testing.md`
states the concrete tests that task must add.

## The tier situation, stated plainly

**Both Playwright tiers are suspended** — `if: false` on the `e2e` and
`e2e-auth` jobs, at the user's direction until the Lit Tracker is built out
(2026-08-09 addendum in
[e2e-testing.md](../../research/testing-qa/e2e-testing.md)). **Every axe scan on
this project lives inside those suites**, so no automated accessibility check
runs on a PR for the duration of this feature either.

That matters more here than it did for #8, and the reason should not be
glossed: this feature's central artifact is a **WebAssembly-rendered canvas**.
It cannot be asserted against in jsdom, and much of what could be asserted about
it — that a page turned, that a highlight landed where the pointer went — is
exactly what a browser tier is for. So this feature's honest coverage split is:

- **Unit and integration carry everything that is not the canvas** — routing,
  authorization, the schema, the mutators, the annotation ↔ row mapping, the
  tab behavior, the notes field. These are the majority of the feature's
  defect surface and they are fully testable today.
- **The browser pass carries the canvas**, per
  [AGENTS.md](../../AGENTS.md)'s verify-in-Chrome rule, and each task's status
  records what was exercised by hand.
- **What the restored suites will owe** is listed at the bottom of this file, so
  the e2e work this feature defers is written down at the moment it is deferred
  rather than reconstructed later.

No new external service is introduced, so nothing changes about the GROBID or
Semantic Scholar stubbing #7 established. Garage is already in the integration
tier's Testcontainers setup from #7's storage work.

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Route resolution**: the detail route renders for an article that exists and
  produces the not-found treatment for an id that does not — including the id
  that exists but belongs to someone else, which must be indistinguishable.
- **The metadata summary**: title, authors under the shared `formatAuthors`
  rule, year and venue when present, nothing where absent. Same expectations as
  the card, because it is the same data and the same helper.
- **The sidebar tabs**: three tabs, the right one active by default, switching
  works by click and by keyboard, and **no Citations tab is rendered** — an
  assertion that will be deliberately inverted by #10.
- **The Annotations tab does not swap the main content**; selecting it leaves
  the reader mounted. This is the behavioral contrast the decided spec draws
  with Citations, and it is the kind of thing that quietly regresses.
- **The Notes field**: reports changes, does not clobber the user's in-progress
  text when a synced value arrives (the decided editing-vs-non-editing rule),
  and does not write on every keystroke.
- **The annotation ↔ row mapping, both directions** (pure functions, no
  EmbedPDF): an EmbedPDF annotation object becomes a row with `type`,
  `page_index`, and `contents` promoted and everything type-specific in
  `payload`; a row becomes an object EmbedPDF's `importAnnotations` accepts,
  with `author` and timestamps populated from the row rather than stored. Round
  -tripping one of each of the 12 types loses nothing.
- **The committed-only rule**: an uncommitted annotation event does not produce
  a write, and the committed one that follows it does. Asserted against the
  bridge with a fake event source, not against a real engine.
- **The annotation list rows**: snippet and page number, a sensible fallback for
  an annotation with empty `contents`, and the click handler invoked with the
  right page.
- **The reader's loading and failure states** render distinctly, with the engine
  and the document fetch both mocked.

## Integration (Vitest + Testcontainers Postgres)

- **Migrations** apply cleanly to a fresh database, producing `annotations` with
  the `(article_id, page_index)` index and both `ON DELETE CASCADE` foreign
  keys.
- **Mutator authorization — the load-bearing test**, as it was for #8. With two
  users' articles and annotations present, each annotation mutator run under
  user A's context against user B's row writes nothing and fails; run under A's
  own context it succeeds. Verified through the same path `/mutate` uses.
- **The notes mutator** obeys the same rule: A cannot write B's `articles.notes`.
- **Cascades**: deleting an article removes its annotations; deleting a `user`
  removes that user's annotations — extending the account-deletion cascade #7
  and #8 established for the tables before this one.
- **Publication membership**: `annotations` is in `zero_data`, so a row inserted
  directly into Postgres replicates. (CI's drift check covers the generated
  schema; this covers the publication, which the generator does not know about.)
- **The PDF route's authorization**, against a real Garage container: a signed-in
  owner gets their bytes with `application/pdf`; a different user gets the
  not-found response; an anonymous request gets the not-found response; an
  article whose object is missing from the bucket fails cleanly rather than
  streaming a partial body. **These four are the security core of task 2** and
  the reason it is a task of its own.
- **`payload` round-trips through Postgres** as `jsonb` without reordering or
  type-coercing anything EmbedPDF cares about.

## Browser verification (per task, recorded in its status.md)

Not a tier, but a required gate, and for this feature the primary evidence for
anything involving the canvas:

- The reader renders a real multi-page PDF from the user's own collection, at
  narrow, mid, and wide widths and in both themes, scrolled from first page to
  last.
- Page navigation, the page indicator, and zoom all work, and the document
  scrolls **inside its panel** without the page itself gaining a scrollbar.
- Each of the 12 annotation types can be created, and the created mark persists
  across a reload.
- A mark made in one window appears in a **second window** — not a second tab,
  which Zero does not sync while hidden.
- Dragging an ink stroke produces **one** row, not one per frame.
- The sidebar drawer opens and closes below the breakpoint, and the reader is
  still usable with it open.

## Accessibility

Asserted at the unit level for as long as axe is unavailable in CI:

- The tab list is a real tab interface with the expected keyboard model, and
  each tab has a discernible name.
- Every icon-only toolbar control has an accessible name; the active annotation
  tool's state is exposed programmatically and conveyed by more than color.
- The notes field is labelled; the annotation list is a list to assistive
  technology and each row is reachable and activatable by keyboard.
- The document region is **labelled rather than left as an unnamed canvas**.
  What is not claimed: the rendered PDF is not accessible text, and nothing here
  makes it so — see
  [constraints-and-behavior.md](./constraints-and-behavior.md).
- Contrast is checked by hand in both themes during the browser pass.

## Coverage / gating

- Vitest `v8` coverage, ratchet-style (must not drop PR-over-PR), per
  [test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md);
  the integration tier participates in the same gate.
- The `src/zero/schema.gen.ts` drift check runs in CI: adding `annotations` to
  Drizzle without regenerating the Zero projection fails the build.
- **A ratchet caveat this feature will hit.** A large client-only reader
  component is hard to cover in jsdom, so it will pull line coverage down unless
  the logic inside it is extracted into testable modules — the mapping, the
  committed-only gate, the page-jump plumbing. Treat a coverage drop here as a
  signal that too much logic is sitting inside the component, not as a reason to
  lower the gate.

## What the restored e2e suites will owe

Written down now, so the deferred work is a list rather than a memory:

- Navigating from a card to its detail page and back, with the card's three-dot
  menu still working and not triggering navigation.
- The PDF actually rendering in a real browser — the one assertion no other tier
  can make.
- Creating a highlight and seeing it survive a reload.
- The annotations list jumping the reader to the right page.
- The sidebar drawer at narrow widths.
- **axe scans** on the detail page in both themes, with the reader loaded, the
  drawer open, and the annotation list populated.
