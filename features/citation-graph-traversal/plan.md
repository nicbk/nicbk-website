# Plan: Citation-Graph Traversal

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`the-references-can-be-trusted`](./tasks/the-references-can-be-trusted/description.md) | [#202](https://github.com/nicbk/nicbk-website/issues/202) | `raw_text`, `reference_count`, the merged-row rule, the backfill |
| 2 | [`citations-are-queryable`](./tasks/citations-are-queryable/description.md) | [#203](https://github.com/nicbk/nicbk-website/issues/203) | Owner-scoped Zero queries, both directions |
| 3 | [`the-citations-view`](./tasks/the-citations-view/description.md) | [#204](https://github.com/nicbk/nicbk-website/issues/204) | The tab, the hidden reader, three lists, links, credit, messages |
| 4 | [`the-way-back`](./tasks/the-way-back/description.md) | [#205](https://github.com/nicbk/nicbk-website/issues/205) | The path in the header |

## Why this order

- **Data before the view that shows it.** Task 3 renders printed text and the
  shortfall. Built on today's rows, it would be designed around GROBID's guesses
  and then re-checked.
- **Tasks 1 and 2 are independent**, and each is its own review: a migration
  and a backfill, and an authorization boundary.
- **The path last**: it needs in-collection items to navigate from.

## Risks

- **The backfill overwrites a correction.** It is limited to bibliography
  columns, and an integration test edits an article's details, runs it, and
  asserts they are unchanged.
- **The merged-row rule drops a real reference.** Measured on five papers, it
  removes exactly two. Its unit tests include a short title contained in a long
  real one, which must not be dropped.
- **A hidden reader keeps working.** Scroll saves, tiling and the pinch guard
  must not act on a hidden panel; checked by reading the stored position before
  and after time spent in Citations.
- **The path grows unwieldy anyway.** Folding and the 20-id cap bound it;
  checked with five hops and at phone width.

## Dependencies

#7 (edges), #9 (detail page, sidebar), #23 (reading position, kept across the
swap).
