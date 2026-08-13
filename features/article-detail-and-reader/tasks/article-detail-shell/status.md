# Status: Article Detail Shell

**State:** Implemented, awaiting review. First of five.

- Branch: `article-detail-and-reader/article-detail-shell`, from `main` at
  `2904142`.
- Sub-issue: [#96](https://github.com/nicbk/nicbk-website/issues/96)
  (parent [#95](https://github.com/nicbk/nicbk-website/issues/95)),
  self-assigned.
- PR: opened once the unit tier, the integration tier, and the browser pass were
  all clean.

## Settled with the user before writing

The three open items below were agreed up front rather than decided inline.

- **Reuse needs the shipped code to move.** `ArticleMenu` and
  `useCollectionMutations` both lived under `-collection-page/`, and reaching
  across route folders for them is what moving `useIncrementalReveal` to
  `-shared/hooks/` was meant to stop. The menu moved to
  `-components/article-menu/`; the hook became `useArticleMutations` under
  `-hooks/`, since its old name described where it lived rather than what it
  wrote. Copying either was rejected: #11 would then have two menus to extend
  and there would be two write paths to keep authorizing identically.
- **The drawer is shared, not duplicated.** `FiltersDrawer` split into
  `NarrowScreenDrawer` (how a sheet behaves) and a four-line wrapper (label,
  icon, contents). The part worth not copying is the close-on-resize effect — it
  was found by dragging a window wider with the sheet open, and a duplicate of
  it is a duplicate nobody would think to fix.
- **The sidebar's drawer trigger sits in the metadata header row**, not above
  the reader and not inside the reader's toolbar: that row is already the page's
  header and never scrolls away, and the reader's toolbar is otherwise entirely
  about the document.
- **Notes debounce at 1000ms**, not the search bar's 250ms. That one mirrors
  typing into the URL for feedback; this is a database write of prose, where a
  quarter second is a write per word.

## Settled during the browser pass

Four defects, all found by using the page and none visible to any test. The user
raised the first two.

- **The card had a dead patch.** The first build stretched one anchor over the
  card with a positioned pseudo-element, so anything that had to sit *above*
  that overlay to keep working stopped being part of the link — the menu
  deliberately, but also the tag strip, which scrolls sideways under the pointer
  and therefore cannot be covered. Clicking a chip did nothing. Replaced with
  the rule the behaviour actually wants: the card opens the article unless the
  click was meant for a control. A real anchor still wraps the title, authors,
  and publication line, so it stays a link; a handler on the card covers the
  rest. Three CSS workarounds went with the overlay.
- **The sidebar did not fit the rail, and widening the rail was the wrong fix.**
  It reached 18rem before the user pushed back — 7rem taken from the reader, the
  page's primary surface, to avoid adapting a component whose job is to adapt.
  The reading-status row was three columns because that suits the card's
  popover. `ArticleTagControls` is now a **container** and queries its own
  width: stacked in the rail, three across in the popover and the sheet. The
  rail stays 11rem and no longer changes width between routes. The filter rail
  one panel over was already listing the same three words vertically, which was
  the answer all along.
- **The selected tab had no styling at all.** Keyed on `[data-selected]` by
  analogy with the toggles' `[data-pressed]`; Base UI's `Tab` exposes selection
  as `aria-selected`. Keyed on the accessibility contract now. The strip also
  gained the full-width rule a selected tab's underline needs to read against —
  without it the tabs were two stray words in a corner.
- **Tag names broke mid-word** ("architectur / e") in the narrow rail, because
  `overflow-wrap: anywhere` suits a 16rem popup and not an 11rem column. Elided
  on one line, matching the filter rail. Dropping the sections' horizontal
  padding in the narrow container — it exists so the scrolling list can reach a
  *popup's* edges, and a rail has none — also gave the filter field back the two
  characters of placeholder it was clipping.

## Verification

- **857 unit tests**, typecheck (incl. CSS-Module codegen and the schema drift
  check), and lint green.
- **Integration**: the `articles.setNotes` mutator, six tests, including that
  user A cannot write user B's notes with B's row genuinely present, that a
  cleared field stores as `''` rather than `null`, and that whitespace survives
  unlike a tag name.
- **Browser pass** (Compose app, Chrome): card → detail navigation and back;
  clicking a chip opens the article and clicking the menu does not; tags and
  reading status writing live; a note persisting through the mutator into
  Postgres; the container query stacking in the rail and spreading in the
  popover and the sheet; both themes; 1280px and 560px; the sidebar drawer below
  the breakpoint.
- Seeded nothing: the pass ran against the four real papers. The one note and
  the one tag toggled during it were reverted afterwards.

## Log

- 2026-08-13 — Implemented across three commits: the sharing refactor, the page,
  and the browser-pass fixes. Held up mid-verification by a local Zero sync
  fault — zero-cache's replica went empty after a rebuild re-ran the migrate
  job, and the diagnosis wiped the replica volume, which made it worse before it
  recovered. No data was lost; Postgres was correct throughout.
