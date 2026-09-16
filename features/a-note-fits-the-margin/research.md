# Research: A Note Fits the Margin

Everything here was measured on 2026-09-16, before the spec was written.

## 1. What the tool does today

`@embedpdf/plugin-annotation` 1.x, `dist/index.js`, the `freeText` tool:

```js
defaults: {
  type: PdfAnnotationSubtype.FREETEXT,
  contents: "Insert text",
  fontSize: 14,
  fontColor: "#E44234",
  fontFamily: PdfStandardFont.Helvetica,
  ...
},
clickBehavior: {
  enabled: true,
  defaultSize: { width: 100, height: 20 },
  defaultContent: "Insert text"
}
```

Nothing in this project overrides either: `reader-plugins.ts` passes
`tools: [LINK_TOOL_OVERRIDE]`, which names the `link` tool only. So 14pt in a
100 × 20pt box is what a reader gets.

## 2. The margins these notes have to fit

Taken from the papers themselves, through the local GROBID
(`teiCoordinates=p`, which returns each paragraph's boxes as
`page,x,y,width,height` in PDF points, origin upper-left). The text block is the
extent of those boxes on a body page; the margin is what is left of the 612pt
page beside it.

| paper | style | text block | left margin | right margin | body line height |
|---|---|---|---|---|---|
| Attention Is All You Need | NeurIPS | 108 → 506pt | 108pt | 106pt | 8.6pt |
| RoBERTa | ACL | 72 → 526pt | 72pt | 86pt | 9.8pt |

**72pt is the narrow case** — one inch, the ACL/ICML template — and it is the
one the default has to fit, because a box that fits 72pt also fits 108pt.

## 3. What fits in 72pt

Helvetica's average lowercase advance is close to 0.5em, so characters per line
≈ `margin ÷ (0.5 × fontSize)`:

| size | chars per 72pt line | against 9.8pt body text |
|---|---|---|
| 14pt (today) | ~10 | 1.4× — larger than the paper |
| 9pt | ~16 | the same size as the paper |
| **8pt** | **~18** | smaller: reads as a note |
| 7pt | ~20 | smallest legible without zoom |

**8pt, in a box 72pt wide**, decided with the user. The box width matters as
much as the size: at 100pt the engine's own click-created box hangs 28pt into
the text block on an ACL paper.

## 4. What this does not touch

- The **stored** `fontSize` of existing notes. The engine writes it onto each
  annotation, so the change reaches new notes only — which is what makes it
  safe to make without a migration.
- **Drag-created** boxes take the drag's rectangle, so `defaultSize` is the
  click case. The font size applies to both.

## Sources

- `node_modules/@embedpdf/plugin-annotation/dist/index.js` — the tool's
  `defaults` and `clickBehavior`, read directly.
- `src/routes/lit-tracker/-article-detail/reader/reader-plugins.ts`,
  `link-annotations.ts` — the tool-override mechanism this project already uses,
  and its merge rule (top-level fields replace).
- GROBID 0.9.1-crf on the local stack, `/api/processFulltextDocument` with
  `teiCoordinates=p`; [Coordinates in
  PDF](https://grobid.readthedocs.io/en/latest/Coordinates-in-PDF/) for the
  format.
