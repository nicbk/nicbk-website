# Status: Where a Link Points

**State:** **Merged** (2026-09-14) as `f4e5a9b`. Task 2 of 3. Two rules were
added by task 3's browser pass — see that task's status.

- Branch: `a-link-is-a-link/where-a-link-points`, from `main` at `dd0d9b1` with
  task 1 merged.
- Sub-issue: [**#187**](https://github.com/nicbk/nicbk-website/issues/187).

## What shipped

`link-preview-region.ts` — `previewRegion`, a pure function from a link's text,
its destination, the pages' text runs and every link landing to a region
`{ pageIndex, rect }` in top-left page points, or `null`. No engine, no DOM.

## Validated against the real papers, not only the fixtures

The unit tests use synthetic pages. The **actual module** was also run in Node
over every internal link of the local papers with the reader's engine — link
text from the glyphs inside each link's box (`getPageGlyphs` →
`getTextSlices`), exactly as task 3 will get it.

| paper | internal links | numbered citations | preview on its own entry |
|---|---|---|---|
| *Attention* (LaTeX, numbered) | 95 | 77 | **76** — the one miss is a `Table 4` link on the page where references begin, correctly left on its table |
| PLOS ONE (publisher) | 135 | 62 | **62** |
| BERT (two-column, author–year) | 260 | — | column-bounded; entries end at the next |
| NeurIPS paper (author–year) | 132 | — | height p50 28pt, p90 64pt |

"On its own entry" is measured by position — the crop's top on the line that
starts with the citation's label — because PLOS's extracted text is garbled
(accents as separate runs, words out of order) and a text comparison called
correct crops wrong.

## What the real papers changed — three rules the spec did not have

The first run over the papers found three defects the synthetic fixtures had
not, and each is now a rule with a test shaped after the page that exposed it:

1. **A line is in the column only if it starts near the target.** On a BERT
   page the right column's baselines fall *between* the left column's, so a line
   beginning 235pt to the right was read as the entry's next line: a 464pt crop
   of both columns. A line must start within a hanging indent (20pt) of the
   target.
2. **The fallback height follows the text, not a constant.** The last entry in
   a column has no landing below it, and the flat 120pt fallback showed three
   entries. The block now ends at a line returning to the left edge after
   indented ones — the next entry of a hanging-indent list — or at a paragraph
   gap. Peters et al.: 123pt → 49pt, its four lines.
3. **How much a target is trusted decides when it may snap.** The spec's guard
   (snap only if the target's line starts with a label) held *Attention* at
   76/77 but left PLOS at 30/62: half its rectangles land in the contributions
   block *above* the reference list. Exact XYZ targets (LaTeX) still snap only
   onto a label line, which keeps `Table 4` on its table; approximate targets
   (rectangles, no position) snap whenever the page is a numbered list. PLOS:
   30 → 62.

## Verification

- 33 unit tests; full suite 1733 pass. Typecheck and Biome clean.
- **Every rule was removed in turn and its test confirmed to fail** — 17
  mutations. Two were not caught on the first pass (the gutter break; the
  minimum width), and one after the third change (the paragraph gap); each got a
  test that fails without it.

## Log

- 2026-09-14 — Implemented; validated over four real papers; three rules added
  from what they exposed.
- 2026-09-14 — Spec'd.
