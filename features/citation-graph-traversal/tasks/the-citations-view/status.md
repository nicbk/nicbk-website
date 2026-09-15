# Status: The Citations View

**State:** In review ([#204](https://github.com/nicbk/nicbk-website/issues/204); PR [#211](https://github.com/nicbk/nicbk-website/pull/211)).

## What shipped

- **The Citations tab**, fourth in the sidebar, between Notes and Annotations.
  It is selected exactly when the URL says `?view=citations`, in the rail and
  the sheet alike. Any other tab brings the reader back. Choosing it in the
  narrow-screen sheet closes the sheet; other tabs keep it open.
- **The reader is hidden, not unmounted** (`hidden` on its slot). Its position
  is not saved while hidden.
- **The citations view** (`-article-detail/citations/`):
  - three tabs with counts, drawn from `citationEdges.references` and `.citedBy`;
  - papers in the collection and papers citing it, newest first, each a link to
    that paper's reader (the link drops `view`);
  - outside references as printed, linking to Semantic Scholar in a new tab when
    they have an id, plain text otherwise;
  - the not-read, none-in-collection and N-of-M messages, plus "everything it
    cites is in your collection" and "nothing in your collection cites it" for
    the two other empty states;
  - the Semantic Scholar credit, always visible below the list.
- **The page's controls move with the view.** They sit in the reader's toolbar
  while it shows and in the citations view while that shows, rendered in one
  place at a time.

## Decided at implementation (2026-09-15)

- **Phone layout** (asked with previews; the user combined the options): below a
  40rem panel, the controls move into the credit row at the bottom, and each tab
  shows a glyph (library / quotation mark / globe), its count and a short word
  (collection / cited by / elsewhere). The full label stays the accessible name.
  The first version wrapped the full labels to four lines a tab at 375px.
- **History:** switching view pushes an entry, so Back from the citations view
  returns to the paper.
- **A paper appears once per list**, however many references resolve to it.

## Verified

- **Unit.** List rules, notices, URL encoding; the view's rows, links, `rel`,
  messages and credit; the sidebar's tab/view agreement and per-article reset;
  the page's swap, controls and sheet; the route's search schema; the paused
  reading-position hook.
- **Mutation checks**, each caught by a failing test:
  - unmounting the reader instead of hiding it, and not hiding it at all;
  - saving the position while hidden;
  - leaving the sheet open on Citations;
  - rendering the controls in both places;
  - the sidebar ignoring `view`, not clearing it, or not resetting per article;
  - the paper link keeping `view`;
  - dropping `rel`;
  - an unencoded Semantic Scholar id;
  - a shortfall claimed without a count;
  - reordering outside references.
- **Chrome, local**, on *Attention* with seeded papers (deleted by id after):
  - three lists and counts;
  - to Citations and back: same scroll offset, page and zoom, no PDF request,
    stored position unchanged;
  - an in-collection paper opens in its reader with the sidebar on tags;
  - 39 outside links with `target=_blank` and `rel`, one plain row;
  - Back, desktop and ~600px widths, both themes.
- **Safari, local, 375px:** sheet closes on Citations and stays open on notes;
  the hidden reader keeps its offset and page, and the stored position is
  unchanged; the phone layout.

The CSS that makes `hidden` hide the slot (`.main[hidden]`) is not reachable
from jsdom; it was found missing in the browser, where the reader stayed drawn.

## Log

- 2026-09-14 — Spec'd.
- 2026-09-15 — Implemented.
