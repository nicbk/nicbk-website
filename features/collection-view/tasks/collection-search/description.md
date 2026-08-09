# Task: Collection Search

Fourth of four, and the one that finishes the decided collection view. It fills
the last placeholder #7 left behind: the search slot the toolbar has been
holding open since task 3 of that feature.

## What this task does

- **Puts the search input in the toolbar's reserved slot**, using the shared
  `SearchInput` the blog list already uses — the decided spec describes both
  search bars as the same control, so they are the same component.
- **Matches title, authors, tags, and reading status**, filtering **as the user
  types**. No submit, no debounce on the visible result, and no server round
  trip: the rows are already on the client, synced by Zero, which is exactly why
  the decided spec calls for live filtering rather than a search endpoint.
- **Composes with the rail's filters** from task 3 — the visible set is the
  intersection of the text query and the selected tags and status, evaluated by
  one predicate in one place.
- **Aligns the toolbar controls to the search bar.** The "+" button and the
  upload-status indicator sit **immediately against the input's trailing edge**
  at every width, moving with it rather than staying pinned to the far edge of
  the content column — and the toolbar row keeps the same width as the card grid
  below it.
- **Adds infinite scroll**: the first batch of cards renders, and more are
  revealed as a sentinel scrolls into view, until the filtered set is exhausted.
  This is the blog's `useIncrementalReveal`, reused — the rows are already in
  memory in both cases, so "infinite scroll" means revealing, not fetching.

## Why last

Search is the only filter that has to compose with another. Written before the
rail, its interaction with tag and status selection would have been designed
against an absence and then revisited; written after, "text AND tags AND status"
is a single predicate over state that already exists.

Infinite scroll rides along with it for the same reason: what gets revealed
incrementally is the *filtered* set, so it wants both filters present before it
is built.

## Not in this task

- **Server-side search.** `articles.authors_search` and its trigram index stay
  unused — their own schema doc says reactive search does not read them.
- **Sort controls.** Nothing decided specifies any; order stays newest-first.
- **Any change to the "+" button or the status indicator themselves.** Only
  their position is this task's concern; their behavior is #7's and must not
  regress.
