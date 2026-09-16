# Research: A Citation Opens the Paper

Measured on 2026-09-16, before the spec was written, against the local GROBID
(0.9.1-crf, the deployed version) and the papers in the collection.

## 1. GROBID locates both ends, on request

`/api/processFulltextDocument` — the endpoint the pipeline already calls —
accepts `teiCoordinates=<element>`, repeated. It returns `coords` as
`page,x,y,width,height` in PDF points, **origin upper-left, y downward**, with
several boxes separated by `;` when the element spans lines
([Coordinates in PDF](https://grobid.readthedocs.io/en/latest/Coordinates-in-PDF/)).

Asked for `ref` and `biblStruct` on two papers:

| paper | in-text markers | with coordinates | resolving to an entry | entries with coordinates |
|---|---|---|---|---|
| RoBERTa | 102 | 102 | 97 (95%) | **51 of 51** |
| Attention | 58 | 58 | 58 (100%) | — |

The entries carry `xml:id="b0"…"bN"`, sequential and in `listBibl` order — the
order this pipeline writes its edges in.

**Both ends are available, so the feature can be built from either.** Decided
with the user: use the **entry** rectangles, because they answer the question
the preview already raises ("which reference is this?") without putting a new
interactive layer over the page.

## 2. One request feeds both the first read and the re-read

`services.extractMetadata` → `requestTei` (`extraction/grobid.ts`) → `parseTei`
is the only path to GROBID, and both `extract-stage.ts` and #10's
`citations/reread-stage.ts` go through it. So one added form field reaches new
uploads and older papers alike, and #10's re-read is the backfill.

Today's request sends `consolidateHeader=0`, `consolidateCitations=0`,
`includeRawCitations=1` and nothing else.

## 3. What the preview already knows

`previewRegion` (#22) returns `{ pageIndex, rect }` — a page and a rectangle in
page points — for whatever the clicked link lands on: a reference entry, a
table, a section heading. That is the value to match against a stored entry
rectangle.

**The open question, and the first thing to prove:** EmbedPDF's page rects and
GROBID's coordinates are both stated top-left with y downward, but that
agreement has not been observed on a real paper. Task 1 checks a known entry's
stored rectangle against the same entry's previewed region before anything is
built on it.

## 4. Where the rectangles go

`citation_edges` already carries what a row was parsed from (`raw_text`), so the
entry's location belongs beside it rather than in a table of its own: it is one
value per row, written and rewritten with the row, read only with the row, and
never filtered on. `jsonb`, like `authors` and the annotations' `payload`.

## Sources

- GROBID 0.9.1-crf on the local stack, and its coordinates documentation.
- `src/lit-tracker/extraction/grobid.ts`, `services.ts`, `tei/bibliography.ts`.
- `src/lit-tracker/citations/reread-stage.ts` (#10's backfill).
- `src/routes/lit-tracker/-article-detail/reader/link-preview-region.ts` (#22).
- `src/db/schema/lit-tracker.ts` — `citation_edges`.
