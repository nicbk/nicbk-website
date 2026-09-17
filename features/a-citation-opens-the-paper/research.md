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

## 5. How much of an entry a region covers (task 2, 2026-09-16)

Measured over the **343 located references** in the local collection — BERT,
RoBERTa, Attention, ConvS2S and Layer Normalization, both uploads of each — by
modelling #22's region for every entry from the entry's own stored rectangle and
scoring every other entry on the page against it.

The region is not a copy of the entry's rectangle. #22 snaps to a **text run**,
whose rect carries the line's ascent, while GROBID's boxes are tight to the
glyphs: in the measurement above, the region begins 7.47pt higher than the entry
it is showing. That overshoot is what reaches into the entry printed above.

| | coverage of the entry |
|---|---|
| the entry the region is showing | **1.000**, all 343 |
| the entry printed above it, worst case | **0.406** — Layer Normalization, a one-line entry clipped by 3.22pt |
| the next worst | 0.185 |
| every other entry on the page | 0 |

So **half** separates them with room on both sides, and **no region in the
collection covered two entries** — the refusal the spec requires is a guard, not
a routine answer.

**The page is not a formality.** The region measured in the browser covers
0.9982 of its entry on page index 10 and 0.9984 of a *different* reference on
page index 9: a bibliography is set the same way on every page it runs over, so
a rectangle without a page is ambiguous by construction.

## Sources

- GROBID 0.9.1-crf on the local stack, and its coordinates documentation.
- `src/lit-tracker/extraction/grobid.ts`, `services.ts`, `tei/bibliography.ts`.
- `src/lit-tracker/citations/reread-stage.ts` (#10's backfill).
- `src/routes/lit-tracker/-article-detail/reader/link-preview-region.ts` (#22).
- `src/db/schema/lit-tracker.ts` — `citation_edges`.
