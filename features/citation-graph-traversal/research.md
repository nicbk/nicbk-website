# Research: Citation-Graph Traversal

Measured and decided 2026-09-14, against `main` at `daa8fc2`.

## 1. What already exists

- **Data.** `citation_edges` is built and populated
  ([citation-graph-schema.md](../../research/data-modeling/citation-graph-schema.md)),
  synced (in `drizzle-zero.config.ts` and the `zero_data` publication since
  migration 0002), with Drizzle relations `articles.references` /
  `articles.citedBy` and their Zero relationships generated.
- **No read path.** `src/zero/queries.ts` has no citation query; nothing in
  `src/routes` renders an edge; nothing on screen credits Semantic Scholar.
- **The sidebar is ready for a fourth tab.** `article-sidebar.tsx` declares its
  tabs as data and says Citations "arrives with the citation graph it opens".
- **Decided before, and still standing:**
  - list views, not a graph canvas
    ([citation-graph.md](../../research/technologies/citation-graph.md));
  - three traversal modes as tabs, the Citations sidebar tab swapping the main
    area
    ([citation-graph component](../../research/ui-ux/pages/lit-tracker/components/citation-graph.md));
  - the Semantic Scholar credit requirement.
- **Left open for this feature:** where the trail of hops goes, now that the
  title sits beside the app name
  ([header.md](../../research/ui-ux/pages/lit-tracker/components/header.md),
  2026-08-13 revision: "a decision for the feature that introduces traversal").

## 2. The data, measured (local stack)

| paper | references | in collection | with S2 id | cited by |
|---|---|---|---|---|
| *Attention Is All You Need* | 40 | 2 | 39 | 1 |
| *BERT* | 61 | 1 | 59 | 0 |
| *Convolutional Sequence to Sequence Learning* | 53 | 1 | 50 | 1 |
| *Layer Normalization* | 32 | 0 | 32 | 2 |

**"Not in your collection" is most of the view**, so it is the list that most
needs to read well. 95%+ of its rows have a Semantic Scholar id, which is what
makes linking out worthwhile.

## 3. Swapping the reader out, measured (nicbk.com, Chrome)

Opening the same paper from the collection three times in one tab:

| open | reader mounted | first page drawn |
|---|---|---|
| 1st (cold) | 653ms | 920ms |
| 2nd | 134ms | 369ms |
| 3rd | 137ms | 368ms |

A remount is ~0.4s of blank panel before the saved reading position (#23) puts
the reader back. **Decided with the user: hide the reader instead**, trading the
engine's memory for an instant return.

## 4. The deferred trust items

Carried from
[semantic-scholar-enrichment/status.md](../article-upload-and-extraction/tasks/semantic-scholar-enrichment/status.md)
("Deferred: closing the rest of the citation graph"). **Decided with the user:**
items 1–3 are in this feature, and hand-editing references is not.

- **Merged rows.** Candidate rule: *an unresolved row with no Semantic Scholar id,
  whose letters-and-digits title contains the full title of a Semantic
  Scholar-resolved row from the same citing article.* Run on all five local
  papers, it matches exactly two rows, the two known ones:

  ```
  Understanding the difficulty of training deep feedforward neural networks. The handbook of brain theory and neural networks
  Convolutional networks for images, speech, and time series. The handbook of brain theory and neural networks
  ```

  Each contains both a resolved title and a second resolved title (the handbook
  entry), and nothing else matched.
- **Printed text.** GROBID's `raw_reference` is already parsed into
  `BibliographyEntry.raw` (`extraction/tei/bibliography.ts`) and discarded by
  `writeBibliography`. Rows added from Semantic Scholar's list with no parsed
  counterpart have none, and show title, authors and year instead.
- **Expected count.** Semantic Scholar's paper record has `referenceCount`; the
  client's `FIELDS` do not ask for it today.
- **Existing papers** have neither printed text nor a count. Re-running the
  bibliography half of extraction on stored PDFs fills both. It must not touch
  the article's own metadata, which a reader may have corrected through #11.

## 5. The way back

The user rejected a plain growing trail: after a few hops it becomes unwieldy.
Prior art considered:

- **ResearchRabbit** opens each exploration step as a new column to the right,
  and scrolling left retraces the path. Strong for browsing, but it scrolls
  sideways and fits a phone badly.
- **Collapsed breadcrumbs** keep the first and last items visible, fold the middle
  into an ellipsis menu, and never wrap on a phone.
- **A session map** (a tree of everything visited) keeps branches, but is a new
  surface.
- **Back/forward only** is familiar, and shows history rather than relation.

**Decided with the user: a short path.** Only the chain from the starting paper
to the open one is kept, never a log:

- returning to a paper already on the path cuts the path back there;
- following a different citation from an earlier paper replaces what came after
  it;
- each step says how it was reached (cites / cited by);
- past three papers the middle folds into "…", which opens the hidden steps;
- it is kept in the URL, per
  [state-management-conventions.md](../../research/coding-conventions/state-management-conventions.md)
  (shareable UI state in search params).

## 6. Outside references

Decided in 2026-07-04 as not clickable. **Revised with the user:** they link to
the paper's Semantic Scholar page, in a new tab and marked external, when a
Semantic Scholar id exists; without one they stay plain text.

## Sources

- [ResearchRabbit — HKUST Library](https://library.hkust.edu.hk/sc/researchrabbit/)
- [ResearchRabbit review — Aaron Tay](https://medium.com/a-academic-librarians-thoughts-on-open-access/researchrabbit-is-out-of-beta-my-review-of-this-new-literature-mapping-tool-3c593d061c63)
- [Breadcrumbs UX — Pencil & Paper](https://www.pencilandpaper.io/articles/breadcrumbs-ux)
- [Mobile breadcrumbs: UX patterns](https://developerux.com/2026/07/19/breadcrumb-navigation-for-mobile-ux/)
- [3 literature mapping tools — Aaron Tay](https://aarontay.medium.com/3-new-tools-to-try-for-literature-mapping-connected-papers-inciteful-and-litmaps-a399f27622a)
