# Testing: Article Detail Shell

What this task's tests must cover. The feature-wide tiers and the suspended-e2e
situation are in [../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

**Routing**

- The page renders for an article present in the synced rows.
- An id **not present** renders the not-found treatment.
- An id belonging to **another user** renders the *same* not-found treatment —
  asserted against the rendered output, so a future change that leaks a
  distinguishable error fails here.
- While the collection is **still syncing**, the page shows neither the article
  nor "not found".

**The metadata summary**

- Title, authors, year, and venue render when present.
- Each is **absent, not blank**, when the article lacks it: an article with no
  venue and no year renders no empty label and no stray separator.
- Authors follow `formatAuthors` — the two-author and four-author cases, since
  those are the boundary the rule turns on.
- The three-dot menu is present and is **#8's component**, asserted by its
  behavior (opens, offers the tag and status controls) rather than by import
  identity.

**The tab interface**

- Exactly **two tabs**, Tags and Notes, with the expected roles and each tab
  associated with its panel.
- **No tab named Citations exists.** This assertion is deliberate and #10 will
  invert it.
- Switching tabs works by click and by keyboard (arrow keys), and the active
  panel changes with it.
- Each tab has a discernible accessible name.

**Tags tab**

- Renders the article's tags, including its reading-status tag among them.
- Toggling a tag invokes the expected #8 mutator with the expected arguments —
  asserted against an injected/mocked mutator surface, not a live Zero client.
- A rejected mutation surfaces through the toast rather than silently.

**Notes tab**

- The field shows the article's stored notes.
- Typing does **not** write per keystroke; the write is debounced.
- **The clobber test, which is the point of this tab's coverage**: with the
  field focused and edited, a synced value arriving for the same article does
  **not** replace what the user typed. The mirror case also holds — a synced
  value *does* land when the field is not being edited.
- The mutator is called with the article id and the new text, and a rejection
  surfaces to the user.

**The card link**

- A card on the collection page renders as a link to the right detail URL.
- **Opening and using the card's three-dot menu does not navigate** — the
  specific regression this change risks. Assert on the menu interaction, not
  only on the link's presence.

**The placeholder**

- The main content area renders the "reader is coming" placeholder, and does not
  render anything resembling a document surface.

## Integration (Vitest + Testcontainers Postgres)

- **Notes mutator authorization**: with two users' articles present, writing
  notes under user A's context against user B's article writes nothing and
  fails; under A's own context it succeeds. Non-vacuous — B's row genuinely
  present, so a handler that wrote nothing at all would still fail this.
- **Notes round-trip**: a written value is readable, and an empty string is
  stored as an empty string rather than silently becoming `NULL` (or vice
  versa — whichever the mutator chooses, the test pins it).

No migration is added by this task, so there is no new migration test.

## Browser verification (record in status.md)

- Click a card, land on the paper's page, use the back button, and land back on
  the collection with its filters intact.
- Both themes, at narrow, mid, and wide widths: the sidebar open above the
  breakpoint, the drawer collapsed below it and openable.
- Tag the article from the sidebar and watch it appear on the card in a **second
  window**.
- Type notes, navigate away, come back, and find them there.
- Open the card's three-dot menu and confirm it does not navigate.

## Coverage

Ratchet applies. This task is ordinary React and ordinary handlers, so there is
no reason for coverage to drop.
