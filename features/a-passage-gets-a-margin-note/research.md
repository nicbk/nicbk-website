# Research: A Passage Gets a Margin Note

Measured 2026-10-12, before the spec was written.

## Traceability

- `research/ui-ux/pages/lit-tracker/components/reader-annotation.md`: the
  decided tools; a highlight and a text box are both among them.
- `features/reader-marking-a-passage/` (#15): the selection menu marks a passage
  directly through `markSelection` without activating a tool. *margin note* is built on
  the same path.
- `features/a-note-fits-the-margin/` (#24): 8pt text, 72pt width.
- `research/accessibility/conformance-target.md`: WCAG 2.2 AA. The menu's
  refusal is text, not colour.

## 1. What a margin note is made of

`@embedpdf/plugin-annotation` 2.15.0:

| Need | What the engine already has |
|---|---|
| a link from note to passage | `inReplyToId` on any annotation (the PDF `IRT` entry) |
| deleting the passage deletes the note | `deleteAnnotation` collects `getIRTChildIds` and deletes them first, emitting a `delete` event for each (`dist/index.js`, `deleteAnnotation`) |
| a note that cannot be moved or resized | the PDF `locked` flag: `isAnnotationStructurallyLocked` is true while the note stays selectable, and `lockedContents` is a separate flag left off, so it stays editable |
| a leader line, if ever wanted | `freeTextCallout`: a `FreeText` with `intent: 'FreeTextCallout'` and a three-point `calloutLine` |

`replyType: Group` was considered and not chosen. A group selects and moves as
one, which the locked note cannot do anyway, and a multi-selection changes what
the selection menu offers.

The sync bridge (`annotation-sync/annotation-row.ts`) stores every engine field
except `id`, `type`, `pageIndex`, `contents`, `author`, `created`, `modified`
and `appearanceModes`. So `inReplyToId` and `flags` are kept with no change.

## 2. Margins in the wild

Text-block edges from the engine's own `getPageTextRuns` on page 2 of each
paper, run in Node against the installed engine. #24's two rows are from GROBID
paragraph coordinates.

| paper | page | left | right | body |
|---|---|---|---|---|
| TraceMonkey, PLDI '09 (ACM, two-column) | 612 × 792 | **54pt** | **56pt** | 9pt |
| TAM review (Word, A4) | 595 × 842 | 57pt | 89pt | n/a |
| Attention Is All You Need (NeurIPS) (#24) | 612 × 792 | 108pt | 106pt | 8.6pt |
| RoBERTa (ACL) (#24) | 595 × 842 | 72pt | 86pt | 9.8pt |

So a 72pt note does **not** fit every margin, and the note takes the margin's
width instead: 46pt on TraceMonkey, about eleven characters a line at 8pt.

A run's `fontSize` is not a reliable size. TAM review reports 1pt for its body,
because the size is carried by the text matrix. This placement uses run
*rectangles* only, which are in page points regardless.

## 3. Why no leader line

A passage's first line starts mid-line more often than not. A line from the
margin to it would cross every word to its left on that line, at 54–108pt of
run. With the note level with the passage, and selection showing both, the pair
reads as one without drawing over the paper.

## Sources

- `node_modules/@embedpdf/plugin-annotation/dist/index.js`: `deleteAnnotation`,
  `getIRTChildIds`, the group helpers, the `locked` flag predicates, and the
  `freeTextCallout` tool.
- `node_modules/@embedpdf/plugin-annotation/dist/lib/annotation-plugin.d.ts`:
  `isAnnotationStructurallyLocked`, `isAnnotationContentLocked`.
- `node_modules/@embedpdf/models/dist/pdf.d.ts`: `PdfTextRun`, `inReplyToId`,
  `calloutLine`.
- [mozilla/pdf.js test PDFs](https://github.com/mozilla/pdf.js/tree/master/test/pdfs):
  `compressed.tracemonkey-pldi-09.pdf` and `TAMReview.pdf`, used as real papers
  because the sandbox cannot reach arXiv.
