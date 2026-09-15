# Status: The Citations View

**State:** Complete ([#204](https://github.com/nicbk/nicbk-website/issues/204); merged in [#211](https://github.com/nicbk/nicbk-website/pull/211), with the reader fix following separately).

## What shipped

- **The Citations tab**, fourth in the sidebar, between Notes and Annotations.
  It is selected exactly when the URL says `?view=citations`, in the rail and
  the sheet alike. Any other tab brings the reader back. Choosing it in the
  narrow-screen sheet closes the sheet; other tabs keep it open.
- **The reader is hidden, not unmounted** (`hidden` on its slot). Its position
  is not saved while hidden.
- **The citations view** (`-article-detail/citations/`):
  - two tabs with counts, *cites* and *cited by*, from
    `citationEdges.references` and `.citedBy`;
  - inside *cites*, *in your collection* (newest first, each opening that
    paper's reader) and then *elsewhere* (as printed, linking to Semantic
    Scholar in a new tab when there is an id);
  - *cited by*, newest first, each opening that paper;
  - the three empty messages; no count comparison;
  - the page's controls at the end of the tab row, whose rule lines up with the
    sidebar's.
- **A credits button in the tracker header** (`-components/credits/`), carrying
  the Semantic Scholar attribution.

## Decided at implementation (2026-09-15)

A first version went to review, and the user found seven problems on trying
it. Decided with the user:

- **Two tabs, the two directions**, instead of *in your collection / cited by /
  not in your collection*, which read as three places.
- **No "N of M references read"**. Measured: *Attention*'s 40 rows are its whole
  bibliography (39 parsed, plus Ba et al., which GROBID missed and Semantic
  Scholar supplied); Semantic Scholar counts 41. BERT 61/63 and Layer
  Normalization 32/33 disagree the same way.
- **The credit in the header's credits popup**: the licence asks for it "on its
  website", not on each page.
- **One row at every width**: two short tabs and the controls fit 375px. This
  replaced a phone variant (glyphs, short words, controls in a bottom row) built
  for three tabs.
- **History:** switching view pushes an entry, so Back returns to the paper.

Not defects, and not changed: "cannot be loaded" and a duplicated *Layer
Normalization* were rows the agent seeded with no PDF and an extra edge. The
re-check used the real pipeline instead (below).

## Verified

- **Unit.** List grouping and order, notices, URL encoding; the view's tabs,
  groups, rows, links, `rel` and messages; the credits popup and its place in
  the header; the sidebar's tab/view agreement and per-article reset; the page's
  swap, controls and sheet; the route's search schema; the paused
  reading-position hook.
- **Mutation checks**, each caught by a failing test:
  - unmounting the reader instead of hiding it, and not hiding it at all;
  - saving the position while hidden;
  - leaving the sheet open on Citations, or rendering the controls twice;
  - the sidebar ignoring `view`, not clearing it, or not resetting per article;
  - the paper link keeping `view`; dropping `rel` (view and credits);
  - an unencoded Semantic Scholar id; reordering *elsewhere*;
  - a linked paper also listed under *elsewhere*; a *cites* count leaving out
    *elsewhere*; a missing "cites nothing else" notice; the credits button
    missing from the header.
- **Chrome, local**, with *Layer Normalization* and *BERT* uploaded through the
  app (GROBID, Semantic Scholar, graduation):
  - *Attention* shows cites 40 (in your collection 1, elsewhere 39) and cited by
    1; *Layer Normalization* appears once;
  - following it opens its reader with the PDF drawn and the sidebar on tags;
  - to Citations and back keeps scroll offset, page and zoom, with no PDF
    request and the stored position unchanged;
  - the tab rules of the view and the sidebar both at y = 99.5px;
  - the credits popup and its link; Back; both themes.
- **Safari, local, 375px:** one tab row (27.4px) with the controls; the sheet
  closes on Citations and stays open on notes; the hidden reader keeps its
  offset and page with the stored position unchanged.

The CSS that makes `hidden` hide the slot (`.main[hidden]`) and the rule
alignment are not reachable from jsdom; both were measured in the browser.

## Log

- 2026-09-14 — Spec'd.
- 2026-09-15 — Implemented; PR #211.
- 2026-09-15 — Reworked after the user's review: two tabs, no shortfall,
  credits in the header, rules aligned.
- 2026-09-15 — Fixed "Annotation state not found for document" (user-reported):
  following a citation, or Back from one, kept this page mounted and handed the
  same reader a second paper. Reproduced in Chrome (Back threw inside
  `ReaderDocument` and the root error page replaced the tracker); the reader is
  now keyed by article. Four citation → Back round trips after: no errors, and
  each paper reopened at its own position.
- 2026-09-15 — #211 merged at `9517700`, before the reader fix above was pushed,
  so main and `nicbk.com` shipped without it and the user kept seeing the error
  there. Carried to main in its own PR.
