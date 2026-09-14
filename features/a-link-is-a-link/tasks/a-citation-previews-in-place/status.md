# Status: A Citation Previews in Place

**State:** **Implemented**, in review. Task 3 of 3 — the last of #22.

- Branch: `a-link-is-a-link/a-citation-previews-in-place`, from `main` at
  `f4e5a9b` with task 2 merged.
- Sub-issue: [**#188**](https://github.com/nicbk/nicbk-website/issues/188).
- **On merge, check #22's parent [#185](https://github.com/nicbk/nicbk-website/issues/185)**
  after the Safari check on `nicbk.com`, and close it by hand.

## Decided before building

**A link inside a mark: the link wins** (user, 2026-09-14). Clicking `[13]`
inside a highlight previews the citation; clicking elsewhere on the highlight
selects it. That was already how the click routed after task 1, measured.

## What shipped

- **`link-preview-source.ts`** — gathers `previewRegion`'s inputs from the open
  document: the link's own characters from the glyphs inside its box
  (`getPageGlyphs` → `getTextSlices`), text runs for the target page and its
  neighbours only, cached per document, and landings from the annotation store.
- **`citation-preview.tsx`** — a Base UI popover anchored to the link's hit area:
  the region rendered with `renderPageRect` at the device pixel ratio, a
  **go to p. N** button, and a line for each other outcome (finding it, points
  outside the paper, could not draw).
- **`link-target.tsx`** — an internal link toggles its preview.

## Browser verification — Chrome, local stack, *Attention Is All You Need*

Reloaded before each check.

| Check | Result |
|---|---|
| click `[13]` | popover: **p. 11**, the crop "[13] Sepp Hochreiter and Jürgen Schmidhuber. Long short-term memory…", 1222px bitmap for 611 CSS px; the reader did not scroll |
| click inside the crop | stays open, reader unmoved |
| **go to p. 11** | popover closes; page 11 with reference 13 in full below the toolbar |
| Escape | closes |
| click outside | closes, reader unmoved |
| the `Table 3` link | **p. 9**: the full caption and the table under it; the popover scrolls for the rest |
| 500px window (Chrome's minimum) | popover 159–484 of 500, no horizontal overflow; crop at the reader's 74% |

### What the browser changed

1. **The crop was smaller than the page it came from.** Fitted to a fixed 448px
   it drew at ~110% while the reader was at 152%. It is now drawn at the
   reader's zoom, capped by the viewport.
2. **"go to" put the entry under the toolbar.** Reference 13 landed flush with
   the top, half behind the floating page controls. The scroll now stops short
   by the toolbar's measured depth, converted to page points at the zoom.
3. **A table link cut its caption at both ends.** The link lands partway along
   the caption's first line, which is one run starting further left — task 2's
   resolver ignored it and measured the column from the lines below. A run that
   *crosses* the target now belongs to the column (a rule added to
   `link-preview-region.ts`, with a test and a mutation).
4. **A table link showed its caption and not the table.** The paragraph-gap rule
   ended the block at the gap between them. A block that opens "Table N" or
   "Figure N" now runs to the height cap.

Items 3 and 4 were rerun over the four real papers: numbered citations still
**76/77** and **62/62** on their own entry.

### What the unit tier found

- **A second click on the link did not close the preview.** To Base UI a press on
  the anchor is a press *outside*, so it closed the popover and the click then
  reopened it. The dismissal is now cancelled when the press is on the link, and
  the link's click decides. A mutation removing that fails the test.
- **An effect loop from unstable hook stubs** hung the first test run; the stubs
  now return stable objects, as the real hooks do.

## Verification

- Unit: **1754** pass (+54 across the feature's three tasks; +21 here). Typecheck
  and Biome clean.
- Resolver: 35 tests; every rule mutated and caught, including the two added
  here.

## Not verified, and why

- **The portal-click guard by a failing test.** Measured in jsdom: one click on
  the portalled popup reaches the link's handler **twice**, so with the guard
  removed two toggles cancel out and the test still passes. The guard stays —
  #20's rule — and the test pins the outcome only.
- **PLOS, BERT and the NeurIPS paper in the browser.** Only *Attention* is an
  article on the local stack. The resolver was run over all four in Node against
  the real module; the popover itself is paper-independent.
- **Safari.** Checked on `nicbk.com` after deploy.
- **Dark theme.** The crop is drawn on white by decision, so it looks like the
  paper; not screenshotted.

## Log

- 2026-09-14 — Implemented; verified in Chrome. Four defects found in the
  browser and one in the unit tier, all fixed.
- 2026-09-14 — Spec'd.
