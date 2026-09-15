# Feature: Citation-Graph Traversal

**#10** in [../index.md](../index.md). Parent issue
[#201](https://github.com/nicbk/nicbk-website/issues/201).

## What it is

Every uploaded paper already carries its bibliography: extraction (#7) writes one
`citation_edges` row per reference and links a row to an article whenever the
cited paper is also in the collection. Nothing reads any of it. This feature is
the view the table was built for.

On an article, a **Citations** tab replaces the reader with three lists:

- **in your collection**: the papers this one cites that you own;
- **cited by**: the papers you own that cite this one;
- **not in your collection**: everything else it cites, as the paper printed it.

A paper in either of the first two lists opens that paper. Following citation
after citation, the header shows **the way back**, a short path from where you
started to where you are.

## What it delivers

- **The Citations tab**, between Notes and Annotations, as decided in
  [article-detail.md](../../research/ui-ux/pages/lit-tracker/pages/article-detail.md).
  While it is open the reader is **hidden, not unloaded**, so switching back is
  instant and the place is kept.
- **Three lists** with counts. In-collection items show title, authors and year,
  and open the paper. Outside items show the printed reference and **link to
  Semantic Scholar** in a new tab, marked external, when Semantic Scholar knows
  the paper.
- **A visible Semantic Scholar credit** wherever its data is shown, per
  [third-party-attribution-requirements.md](../../research/licensing/third-party-attribution-requirements.md).
- **A bibliography that admits its gaps.** When Semantic Scholar reports more
  references than were read, the view says so. "Cites nothing else you own" and
  "its bibliography was not read" are different messages.
- **Cleaner rows.** A reference GROBID merged with its neighbour is dropped when
  both halves arrived cleanly from Semantic Scholar.
- **Older papers catch up on their own.** Papers read before printed text was
  kept are re-read on deploy, with progress in the upload status indicator. A
  failure stays there, with try again, until it succeeds.
- **The way back.** The header's title slot becomes a path
  (`Attention › … › BERT › RoBERTa`). Each step is labelled with how you got
  there (cites / cited by), and returning to a paper already on the path cuts it
  back there. It is kept in the URL, so reload, back and a shared link keep it.

## Does not

- Draw a graph. A node-link canvas was set aside in
  [citation-graph.md](../../research/technologies/citation-graph.md) and stays
  set aside.
- Edit references by hand. That is article-edit's escape hatch, left for a later
  feature (decided with the user, 2026-09-14).
- Add a paper from its reference. Uploading is still the way in.
- Look up the unresolved residue with `/paper/search/match`.

See [research.md](./research.md) for what was measured and decided.
