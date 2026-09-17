# Status: The Entry Is Located

**State:** **Complete** ([#221](https://github.com/nicbk/nicbk-website/issues/221),
PR [#225](https://github.com/nicbk/nicbk-website/pull/225), merged 2026-09-16).

## What shipped

- **`teiCoordinates=biblStruct`** on the one GROBID request, with the reason and
  the measurement beside it.
- **`tei/regions.ts`**: reading `coords` — a page and its boxes, page numbers
  converted to the zero-based index everything downstream counts in. Null for
  absent, malformed or empty values, because a paper GROBID could not locate is
  not a failure.
- **`citation_edges.entry_regions jsonb`**, written by the bibliography writer
  with the rest of the row, synced to the client (the matching happens in the
  reader), and migrated in `0008_classy_chimera.sql`.
- **The backfill's condition**, since #10's marker is spent: a paper is re-read
  when `references_read_at` is null **or** it holds a parsed entry — one with
  printed text behind it — that has no region. A row Semantic Scholar supplied
  has no entry in the paper at all and is never evidence of anything missing.

## The measurement this task existed for

The spec's open question was whether EmbedPDF's page rectangles and GROBID's
coordinates agree. **They do.** Taken in Chrome on BERT, clicking the citation
*(Peters et al., 2018a)* in the body text:

| | page | x | y |
|---|---|---|---|
| what the preview resolved | 10 | 64.02 → 293.00 | 716.13 → 765.00 |
| the stored entry, *Deep Contextualized Word Representations* | 10 | 72.00 → 290.27 | 723.60 → 765.12 |

The entry sits **inside** the previewed region on both axes, and the preview
showed that reference's text, so the identification is not inferred from the
numbers alone. Both are therefore top-left with y increasing downward: had
GROBID's origin been the PDF's own bottom-left, the entry would have been at
y ≈ 27 on a 792pt page, nowhere near.

**The neighbours rule themselves out.** The other entries within that band are
in the right column (x 307–525) or end at y 713.2, above where the region
starts — so on this sample the correct entry is the only candidate. Whether that
holds generally is task 2's rule to state and test, including the two-candidate
case it must refuse.

## Verified

- **Unit.** `coords` read into a region, including a four-line entry taken from
  a real run; a page-straddling entry keeping its first page; malformed, empty
  and zero-area boxes ignored; the request carrying the new field; the parser
  carrying a region through, and leaving an unlocated entry without one.
- **Integration.** A located reference stored with its region, an unlocated one
  with none, and a Semantic Scholar-only row with none. The backfill queues a
  paper whose rows have no regions, and leaves alone one whose parsed rows are
  located — 32 cases pass.
- **The local stack**: the migration applied, the worker queued 8 papers on
  start, and 160 references were located across four of them before the
  measurement above was taken.

## Log

- 2026-09-16 — Spec'd.
- 2026-09-16 — Implemented, and the coordinate agreement measured.
- 2026-09-16 — Merged in #225. Task 2 put the same region against **every**
  located entry rather than the neighbours by eye, and the reading holds: the
  region covers 0.998 of that entry and touches no other on the page. Two
  readings of the table to keep: the page is an **index**, so this is the
  eleventh page; and the identical rectangle on the page before covers a
  *different* reference just as exactly — which is why task 2's rule reads the
  page before the rectangle.
