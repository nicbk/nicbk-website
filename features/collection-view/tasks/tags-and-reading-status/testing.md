# Testing: Tags and Reading Status

What this task's tests must cover, within the feature's overall requirements
([../../testing.md](../../testing.md)).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Mutator validators** reject what they should before any write is attempted:
  an unknown reading-status value, an empty tag name, a malformed id.
- **The card menu**: opens from its trigger; its accessible name identifies the
  article; Escape closes it and focus returns to the trigger; each item invokes
  the expected callback with the expected arguments. Asserted against injected
  callbacks — this is the menu's contract, not the mutators'.
- **Tag entry**: submitting an existing tag name applies that tag; submitting a
  new one requests creation. The distinction is the whole reason there is no
  separate management screen.
- **Status selection** is a single-select group: choosing one reports the new
  status and no "unset the old one" call, because the column is single-valued.
- **The card renders tags**, with the reading-status tag among them, and an
  article with no user tags still shows its status.

## Integration (Vitest + Testcontainers Postgres)

This is where the task's real weight is.

- **Migrations** apply cleanly to a fresh database, producing `tags` and
  `article_tags` with `unique (article_id, tag_id)` and three
  `ON DELETE CASCADE` foreign keys.
- **Mutator authorization — the load-bearing test.** With two users' articles
  and tags present, each of the five mutators run under user A's context against
  user B's row writes nothing and fails; run under A's own context against A's
  own rows it succeeds. Exercised through the same dispatch path `/mutate` uses,
  so a mutator that is correct in isolation but wired up wrong still fails the
  test. **Non-vacuous**: B's rows must genuinely exist, so a handler that wrote
  nothing under any circumstances would not pass.
- **Read isolation for the new queries**: with both users' tags present, the new
  `/query` entries return only the requesting user's, and a request with no
  session returns nothing. The same standard #7 held `articles.mine` to — a new
  synced table is a new read surface, not a free ride on an existing one.
- **Cascades**: deleting a tag removes its `article_tags` rows; deleting an
  article removes its `article_tags` rows; deleting a `user` removes that user's
  `tags` and `article_tags` — extending the account-deletion cascade #7 proved
  for the other three tables.
- **Idempotent attach**: attaching a tag the article already carries creates no
  second row and does not fail.
- **Reading status**: setting a status replaces the previous value on that
  article and touches no other article.
- **Publication membership**: `tags` and `article_tags` are in `zero_data`, so a
  row inserted directly into Postgres replicates. The CI drift check covers the
  generated schema; nothing but this covers the publication.

## End-to-end (Playwright, signed-in suite)

- **Tag round-trip, live**: applying a tag from the card menu shows it on the
  card immediately, and it appears in a **second browser window** without a
  reload. A second *tab* will not do — Zero drops sync for a hidden document,
  and a test written that way fails for a reason that has nothing to do with the
  feature.
- **Create-on-apply**: a tag name never used before becomes a tag and lands on
  the card.
- **Status round-trip**: setting a status updates the card live and clears the
  previous one.
- **Tag deletion** removes it from every card carrying it, live.
- **The menu is keyboard-operable** end to end: reachable by Tab, opened by
  Enter, navigated by arrow keys, closed by Escape with focus restored.
- **Both themes and all three widths**, with the menu open — a popup that
  overflows its container at one width is exactly what this catches.

## Accessibility

- `@axe-core/playwright` runs inline on `/lit-tracker` with tags present and on
  the **open card menu**, in both themes, blocking on critical/serious findings.
  Let the menu's transition settle before scanning.
- The icon-only trigger has a name identifying its article; the status is
  conveyed by more than color; tag chips meet AA contrast in both themes.

## Manual verification (required)

Two windows side by side, per
[AGENTS.md](../../../../AGENTS.md)'s browser-verification rule: tag and re-tag
in one, watch the other. Then both themes at narrow, mid, and wide widths with
the menu open, and a card carrying enough tags to wrap — a tag list is the part
of this card most likely to overflow.
