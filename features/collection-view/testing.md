# Testing: Collection View

Testing requirements for the feature as a whole, per the decided testing tiers
(see [research.md](./research.md) for citations). Each task's `testing.md`
states the concrete tests that task must add.

## Tiers in play, and what is new

All four existing tiers apply — unit, integration (Testcontainers Postgres),
e2e (Playwright, including the signed-in `playwright.auth.config.ts` suite #7
added), and inline accessibility (axe).

What is new is **what the integration tier has to prove about writes**. #7
proved that a user cannot *read* another user's rows through `/query`. This
feature is the first that can *write*, so the mirror-image property —
a mutation aimed at another user's article or tag does not land — becomes an
integration-level correctness requirement rather than a code-review
observation. It must be non-vacuous: the other user's rows genuinely present,
so a handler that silently wrote nothing at all would still fail.

No new external service is introduced, so nothing here changes the GROBID or
Semantic Scholar stubbing #7 established.

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Card rendering** (presentational, no Zero client): title, the "3 or more →
  first author + et al." author rule, publication year, venue when present and
  nothing where absent, and the tag list including the reading-status tag. A
  card with no venue, no year, and no tags renders without empty labels.
- **The card menu**: opens from its trigger, exposes an accessible name naming
  its article, is dismissible by Escape, restores focus to the trigger, and
  invokes the right callback for each item — asserted against injected
  callbacks, not against a live mutator.
- **Filter predicate** (pure): tags AND-compose; a status filter selects on the
  column; search matches title, author name, tag name, and status; search is
  case- and whitespace-insensitive; an article missing a field is not matched by
  a query against that field; combining search with filters intersects rather
  than unions.
- **Filter state hook**: selections round-trip through the URL, an inactive
  filter leaves no trace in the URL, and typing updates the visible set
  immediately while the URL mirror is debounced — the properties `useBlogFilters`
  already establishes, re-asserted for the shape this feature uses.
- **Incremental reveal**: the first batch renders without an
  `IntersectionObserver`, and the visible count grows when the sentinel
  intersects — reusing the blog's hook, so the tests cover its use here rather
  than re-testing the hook itself.
- **Empty states**: "no articles yet" for a genuinely empty collection and "no
  articles match" for a filtered-to-nothing one are distinct, and neither
  appears while the collection is still syncing.

## Integration (Vitest + Testcontainers Postgres)

- **Migrations** apply cleanly to a fresh database, producing `tags` and
  `article_tags` with the `unique (article_id, tag_id)` constraint and the three
  `ON DELETE CASCADE` foreign keys.
- **Mutator authorization — the load-bearing test.** With two users' articles
  and tags present, each mutator run under user A's context against user B's row
  writes nothing and fails; run under A's own context it succeeds. Verified
  through the same path `/mutate` uses, not by calling the mutator body
  directly.
- **Cascades**: deleting a tag removes its `article_tags` rows; deleting an
  article removes its `article_tags` rows; deleting a `user` removes that user's
  `tags` and `article_tags`, extending the account-deletion cascade #7 proved for
  `articles`/`upload_jobs`/`citation_edges`.
- **Uniqueness**: attaching a tag an article already carries does not create a
  second row and does not fail the mutation.
- **Reading status**: setting a status replaces the previous value, and an
  invalid status value is rejected by the mutator's validator before any write.
- **Publication membership**: the new tables are in `zero_data`, so a row
  inserted directly into Postgres is replicated. (The drift check in CI covers
  the generated schema; this covers the publication itself, which the generator
  does not know about.)

## End-to-end (Playwright, signed-in suite)

- **The collection renders as cards** with the metadata #7 extracted — title,
  authors, year, venue — against seeded articles.
- **Tag round-trip, live**: applying a tag from the card menu shows it on the
  card immediately, and it appears in a **second browser window** without a
  reload. The second-window detail is not incidental — a second *tab* is hidden
  and does not sync.
- **Reading status round-trip**: setting a status updates the card and clears
  the previous status, live.
- **Filtering**: selecting a tag narrows the grid; selecting two narrows it
  further (AND, not OR); a status toggle composes with tag toggles; the narrowed
  state survives a reload because it is in the URL.
- **Search**: typing narrows the grid as the value changes without a submit, and
  clearing it restores the full collection; searching an author name and a tag
  name both work.
- **Infinite scroll**: with more articles than one batch, scrolling reveals the
  rest.
- **Toolbar layout**: the "+" button and the status indicator sit against the
  search input's trailing edge, and both still work — the upload flow #7 shipped
  must not regress when the slot beside it is filled.
- **Theming and widths**: correct in both themes and at narrow, mid, and wide
  widths, including the rail's narrow-screen relocation and the grid's collapse
  to one column.

## Accessibility

- `@axe-core/playwright` runs inline on `/lit-tracker` with cards present, on
  the open card menu, and with the filter rail populated, in **both themes**,
  blocking on critical/serious findings.
- The card menu trigger has a discernible name identifying its article; filter
  toggles expose `aria-pressed` and are distinguishable by more than color; the
  grid is a list to assistive technology; the search input has a label; live
  result changes are announced without an announcement per keystroke.

## Coverage / gating

- Vitest `v8` coverage, ratchet-style (must not drop PR-over-PR), per
  [test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md);
  the integration tier participates in the same gate.
- The `src/zero/schema.gen.ts` drift check runs in CI: adding `tags` and
  `article_tags` to Drizzle without regenerating the Zero projection fails the
  build.

## Framework caveats to carry

- **The hydration race and the retrying-interaction helpers** from
  [e2e-testing.md](../../research/testing-qa/e2e-testing.md)'s 2026-08-01
  addendum apply to every new control here — the menu trigger, the toggles, the
  search input.
- **Judge the e2e suite with `npm run test:e2e:prod`**, not `npm run test:e2e`.
- **Zero's sync timing** means assertions may run before a synced diff arrives:
  use retrying matchers, never a fixed sleep, and assert on DOM state rather
  than on the wire.
- **CSS transitions** make one-shot reads (axe scans, screenshots) unreliable
  mid-animation; let the menu settle before scanning.
- **`e2e/` and `e2e-auth/` are not in `tsconfig.json`'s `include`**, so
  Playwright specs are never typechecked — a missing import in a spec surfaced
  only at runtime during #7's task 5. Worth fixing in whichever task first
  touches those files.
