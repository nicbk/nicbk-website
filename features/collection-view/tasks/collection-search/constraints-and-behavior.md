# Constraints and Behavior: Collection Search

Which of the feature's acceptance criteria
([../../constraints-and-behavior.md](../../constraints-and-behavior.md)) this
task satisfies.

## Satisfied here

**From "Filtering and search" — the remainder:**

- The **search bar matches title, authors, tags, and reading status**, filtering
  **live as the user types** against the already-synced rows — never a submit or
  a server round trip.
- **Search and rail filters compose**: the visible set is the intersection.
- The search text participates in the **URL-backed filter state**, so a searched
  view is shareable and survives refresh, with an empty query leaving no trace.
- **"No articles match"** covers a query that excludes everything, distinct from
  the empty-collection text.
- **Pagination is infinite scroll** — incremental reveal of rows already on the
  client, over the *filtered* set. No server paging, no numbered pages.

**From "Toolbar layout" — all of it:**

- The toolbar and the card grid share **one content column of the same width**.
- The **"+" button and the upload-status indicator sit immediately against the
  search input's trailing edge** at every width, moving with it rather than
  staying at the column's far edge. Neither control's behavior changes.
- The page still draws **no visible title**.

**From "Cross-cutting quality":**

- The search input has a label, a visible focus indicator in both themes, and
  AA contrast.
- Live result changes are announced **without an announcement per keystroke** —
  the difference between a helpful status region and an unusable one.
- Correct in both themes and at narrow, mid, and wide widths.
- CI passes.

## Explicitly not satisfied here

- **Server-side search** against `authors_search` — out of scope for the whole
  feature, by decision rather than omission.
- **Sort controls** — none are specified anywhere.
- Everything under **"Schema"**, **"Writes and authorization"**, **"Tag and
  reading-status interaction"**, and **"The article card"** — tasks 1 and 2.

## Exit state

The decided collection view, complete. A signed-in user types "attention" and
the grid narrows as the letters land, matching titles, author names, tags, and
statuses alike; combining that with a rail selection narrows it further; the
whole state is one shareable URL. A collection longer than a screenful reveals
as it is scrolled. The "+" button and the status indicator sit against the
search bar's edge at every width and still do exactly what #7 built them to do.
