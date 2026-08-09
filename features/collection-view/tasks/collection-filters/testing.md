# Testing: Collection Filters

What this task's tests must cover, within the feature's overall requirements
([../../testing.md](../../testing.md)).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **The filter predicate** (pure): two selected tags keep only articles carrying
  **both**, not either; a status selection filters on the column; tags and status
  compose; no selection keeps everything. The AND-versus-OR case is the one worth
  writing first — it is the easy thing to get backwards, and it is invisible
  until a user has two tags.
- **The status group is single-select**: selecting a second status replaces the
  first rather than adding to it, while tags accumulate.
- **URL round-trip**: selections serialize into the URL and read back; an
  inactive filter leaves **no** key behind, so an unfiltered `/lit-tracker` stays
  `/lit-tracker`; an unknown tag in a pasted URL does not crash the page.
- **The rail renders** one toggle per tag plus the three statuses, each exposing
  its pressed state, and renders nothing where there is nothing to render.
- **"No articles match" versus "no articles yet"** are chosen correctly: the
  first only when filters are active, the second only when the collection is
  genuinely empty, and **neither** while the collection is still syncing.
- **The delete confirmation is not skippable**: activating a tag's delete control
  asks first and calls nothing; confirming reports the tag id; cancelling and
  Escape both report nothing. Asserted against an injected callback — that a
  confirmed delete actually deletes is task 2's integration suite.
- **The confirmation names what is at stake**: the tag, and how many articles
  carry it.

## End-to-end (Playwright, signed-in suite)

- **Narrowing works**: selecting a tag reduces the visible cards; selecting a
  second reduces them further (AND); a status toggle composes with tag toggles.
- **The narrowed view survives a reload**, because it is in the URL, and the
  back button steps back through the selections.
- **Deselecting restores** the full collection.
- **Deleting a tag from the rail** asks for confirmation, and on confirming
  removes the tag from the rail *and* from every card carrying it, live and with
  no reload — the criterion moved here from task 2. Dismissing the confirmation
  leaves the tag exactly where it was.
- **A filter combination matching nothing** shows the "no articles match" text
  and no cards.
- **The rail relocates** below the content at a narrow width and sits beside it
  at a wide one, with no horizontal overflow at any of narrow, mid, or wide.
- **The avatar still works.** It shares the rail with these filters and is the
  only way into the settings modal; #7's coverage of it must stay green.
- **Both themes.**

## Accessibility

- `@axe-core/playwright` runs inline with the rail populated, in both themes,
  blocking on critical/serious findings — including at the narrow width where
  the rail has moved, since that is a different DOM order.
- Toggles expose `aria-pressed`, are operable by keyboard, and show a visible
  focus ring in both themes; the rail's navigation landmark has an accessible
  name; the selected state is conveyed by more than color.

## Manual verification (required)

Per [AGENTS.md](../../../../AGENTS.md)'s browser-verification rule: exercise the
filters the way a reader would — toggle several on and off in sequence, use the
back button, paste the URL into a second window — in both themes at narrow, mid,
and wide widths. Check the rail with enough tags to need scrolling: it scrolls
independently of the avatar pinned below it, and that is a claim only the running
page can settle.
