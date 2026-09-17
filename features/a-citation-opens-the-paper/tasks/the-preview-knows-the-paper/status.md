# Status: The Preview Knows the Paper

**State:** Implemented, in review
([#222](https://github.com/nicbk/nicbk-website/issues/222)).

## What shipped

- **`previewed-reference.ts`**: given the region #22 drew and the open paper's
  edges, the one edge that region is showing — or none. Pure, and matched on
  geometry alone: the page first, then how much of the entry lies inside the
  rectangle. The edge comes back as it was passed in, so task 3 keeps the
  article at its other end.
- **`use-previewed-reference.ts`**: the same owner-scoped query the citations
  view reads (`citationEdges.references`), subscribed only while a preview is
  open — a paper carries hundreds of links, and its bibliography is not worth a
  subscription until a reader opens one.
- **The preview holds the answer and draws nothing from it.** A ready preview's
  state carries the reference; what a reader sees is exactly what #22 shipped.

## The threshold, and why it is a half

The region is not a copy of the entry's rectangle: #22 snaps to a text run whose
rect carries the line's ascent, while GROBID's boxes are tight to the glyphs, so
the region starts a little **above** the entry and dips into whatever is printed
over it. So "overlaps" would match two entries constantly, and the rule asks how
much of an entry lies inside instead.

Measured over the **343 located references** in the local collection (BERT,
RoBERTa, Attention, ConvS2S, Layer Normalization), with each entry's own region
modelled from #22's rule:

| | coverage |
|---|---|
| the entry the region is showing | **1.000**, every one |
| the entry printed above it, worst case | **0.406** — a one-line entry in Layer Normalization, clipped by 3.22pt |
| any other entry on the page | below 0.19 |

A half sits in a wide gap rather than on a fine line. **No region in the
collection covered two entries**, so the refusal is a guard rather than a
frequent answer — which is what was wanted: it costs a reader a click, where
opening the wrong paper costs them their place.

## Verified

- **Unit**, against rectangles read out of the local collection rather than
  invented: the region measured in the browser resolves to the reference the
  reader saw; the *same* rectangle one page earlier resolves to a different one,
  so the page decides; a region over two entries resolves to neither, while each
  alone resolves; the clipped line above is not a match (Layer Normalization's
  real worst case); a table's region matches nothing; an edge with no region,
  and one whose region has no boxes, are never matched.
- **Mutation checks.** Dropping the page test fails three rows; returning the
  first of two overlapping entries instead of none fails the row that exists
  for it.
- **The preview** still shows the crop and *go to p. N* and nothing else, with
  the reference found.

## Log

- 2026-09-16 — Spec'd.
- 2026-09-16 — Implemented, with the threshold measured before it was chosen.
