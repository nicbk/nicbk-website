# Research: A Paper Shows Its Contents

Measured 2026-10-12, before the spec was written.

## Traceability

- `high-level-guidance/design/lit-tracker/DESIGN.md`: the reader is where the
  user views and marks up the paper. A contents list is navigation within it.
- `research/ui-ux/pages/lit-tracker/pages/article-detail.md`: the decided
  sidebar has four tabs. **This feature adds a fifth (user-decided 2026-10-12)**,
  which needs a revision to that document; task 3 writes it. *Contents* behaves
  like *annotations*: it does not swap the main area, and choosing an entry
  scrolls the reader.
- `features/citation-graph-traversal/tasks/older-papers-are-re-read` (#10) and
  `src/lit-tracker/citations/reread-stage.ts`: the backfill pattern. Queue at
  worker start, keyed by paper, `exclusive`, and write only what the job owns.
- `research/data-modeling/zero-schema-conventions.md`: UUIDv7, `user_id`,
  epoch-ms, hard deletes.
- `research/accessibility/conformance-target.md`: WCAG 2.2 AA, which sets the
  24px target-size floor for the five-tab rail.

## 1. Nothing is decided about contents yet

`research/`, `features/` and `high-level-guidance/` were searched for
"outline", "bookmark", "table of contents", "toc" and "sections". Nothing is
decided.

## 2. Reading a PDF's outline on the server

The installed engine runs in Node. A script importing
`@embedpdf/pdfium` (`init({ wasmBinary })`) and `@embedpdf/engines/pdfium`
(`new PdfiumNative(module)`) opened each test file and called `getBookmarks`:

| file | pages | outline entries | usable |
|---|---|---|---|
| `nested_outline.pdf` (pdf.js tests) | 9 | 9, two levels ("1. Introduction" › "1.1 Background", …), each with a page | yes |
| `TAMReview.pdf` (pdf.js tests; a real review article) | 23 | **1**, titled `htmldoc797.html` | **no**: junk |
| `outlines_se.pdf` (pdf.js tests) | 2 | 3, targets resolve to **no page** | no |
| `compressed.tracemonkey-pldi-09.pdf` (real PLDI paper) | 14 | **0** | no |

That gives two rules: an entry with no page is dropped, and an outline needs two
or more entries left. The entry shape is `PdfBookmarkObject { title, target?,
children? }` (`@embedpdf/models` `pdf.d.ts`). A target is either a destination
(`pageIndex`, and for `XYZ` a top) or an action that wraps one. The reader
already unwraps both in `link-preview-source.ts` (`destinationOf`).

## 3. GROBID's section heads

GROBID 0.9.1-crf (the image production runs), `processFulltextDocument` with
`teiCoordinates=head` and `teiCoordinates=p`:

**TraceMonkey: 51 body `<head>`s.** The numbered ones are exactly the paper's
sections, each with a box (`page,x,y,w,h`, top-left origin):

```
1.  Introduction                    1,54.00,569.32,…
2.  Overview: Example Tracing Run   2,317.01,532.68,…
3.  Trace Trees                     4,54.00,248.95,…
3.1 Traces                          4,54.00,314.88,…
3.2 Trace Trees                     5,54.00,556.88,…
…
6.4 Preemption                      9,317.01,553.98,…
```

The unnumbered ones are noise: labels from a diagram on page 2 ("Interpret
Bytecodes", "Monitor", "Record", "LIR Trace", …) and run-in paragraph heads
("Type specialization.", "Starting a tree."). Hence numbered heads only.

**TAM review (Word-made) and a synthetic test paper: 0 heads.** GROBID is
trained on scholarly articles. Where it finds nothing, this feature shows
nothing rather than guess.

This repo asks for `teiCoordinates=biblStruct` today
(`src/lit-tracker/extraction/grobid.ts`). The parameter is repeatable, and
parsing a box is already `tei/regions.ts`.

## 4. Why not font heuristics (yet)

The engine's `getPageTextRuns` gives each run's font, weight and size. That is
the raw material for guessing headings. But TAM review reports its body text at
**1pt** (its size lives in the text matrix), and weights come back as `0` for
fonts that do not declare one. A heuristic built on those numbers would need its
own corpus to tune. It is left until the collection shows papers that the two
sources above both miss.

## 5. The sidebar has no room for a fifth tab as built

Measured in Chromium against the signed-in stack:

| where | strip width | tabs today | a fifth |
|---|---|---|---|
| rail, 1400px | 143px | four glyph tabs of **36px** = 144px | does not fit at 36px. Five equal tabs are 28.6px each |
| rail, 1024px | 143px | the same | the same |
| sheet, 375px | 327px | four words: 54 + 63 + 96 + 113 = **326px** | "contents" alone needs 67px. Words do not fit, so glyphs |

The strip's own comment records why wrapping is not the answer: two rows read
as ragged (user-reported). The container query's 20rem threshold was sized for
four words, and moves for five.

## Sources

- `node_modules/@embedpdf/engines/dist/lib/pdfium/engine.d.ts`: `getBookmarks`
  and `getPageTextRuns`.
- `node_modules/@embedpdf/models/dist/pdf.d.ts`: `PdfBookmarkObject`,
  `PdfDestinationObject`, `PdfTextRun`.
- [GROBID: Coordinates in PDF](https://grobid.readthedocs.io/en/latest/Coordinates-in-PDF/):
  the `teiCoordinates` values, `head` among them, and the `coords` format.
- [GROBID introduction](https://grobid.readthedocs.io/en/latest/Introduction/):
  its scope is scholarly technical documents.
- [mozilla/pdf.js test PDFs](https://github.com/mozilla/pdf.js/tree/master/test/pdfs):
  the files measured above. The sandbox cannot reach arXiv.
