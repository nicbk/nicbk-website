# Plan: A Paper Shows Its Contents

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`the-contents-are-read`](./tasks/the-contents-are-read/description.md) | [#245](https://github.com/nicbk/nicbk-website/issues/245) | `article_contents` table (synced); the upload pipeline reads the PDF's outline server-side, falling back to GROBID's numbered heads |
| 2 | [`older-papers-are-read-for-contents`](./tasks/older-papers-are-read-for-contents/description.md) | [#246](https://github.com/nicbk/nicbk-website/issues/246) | A queue that reads every finished paper with no contents row, at worker start |
| 3 | [`the-contents-tab`](./tasks/the-contents-tab/description.md) | [#247](https://github.com/nicbk/nicbk-website/issues/247) | The fifth sidebar tab: the list, the jump, the section in view, the empty states; the tab strip fits five |
| 4 | [`the-toolbar-opens-the-contents`](./tasks/the-toolbar-opens-the-contents/description.md) | [#248](https://github.com/nicbk/nicbk-website/issues/248) | A toolbar button that opens the contents tab, in the rail or the sheet |

## Why this order

The list is only as good as what fills it, and the extraction has to exist
before a backfill can run it. Tasks 1 and 2 put real contents in the database
for every paper. Task 3 shows them, and task 4 makes them one press away. Each
task is demoable: after task 1 a new upload has a contents row, after task 2
every paper does.

## Approach

- **Server-side, once per paper, stored.** The outline is read where the PDF
  already is (the extraction worker), not in every browser on every open. It is
  then available before the PDF has downloaded, and the same everywhere.
- **The outline is read with the engine the reader already ships.**
  `@embedpdf/engines`' pdfium build runs in Node (`research.md` §2), so no
  second PDF library is added.
- **GROBID is asked for heads in the call it already makes.**
  `processFulltextDocument` takes `teiCoordinates` repeatedly. Adding `head`
  beside today's `biblStruct` returns each heading's printed box, with no second
  request (`research.md` §3).
- **One row per article**, holding the list as `jsonb` with its source. The list
  is read whole and replaced whole, never edited entry by entry. A separate
  table, rather than a column on `articles`, keeps a textbook's hundreds of
  entries out of the collection's sync, which loads every article row.

## Risks

- **Junk outlines.** One test paper's outline is a single entry named after an
  HTML file. An outline counts only if at least two entries resolve to a page.
  Otherwise GROBID's heads are used.
- **Outline targets that resolve to no page** (an action rather than a
  destination). Those entries are dropped, and the rule above then decides
  whether the outline is used.
- **pdfium in the worker's memory.** A whole textbook is opened once per job and
  closed after. The job's memory is measured on the largest paper in the
  collection before the backfill runs.

## Dependencies

#7 (the pipeline and GROBID), #9 (the reader and its sidebar), #10 (the re-read
pattern), #22 (jumping to a position on a page).
