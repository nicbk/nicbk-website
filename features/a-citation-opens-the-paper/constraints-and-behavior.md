# Constraints and Behavior: A Citation Opens the Paper

## Behavior

- **The preview gains one action.** When the reference it is showing is a paper
  in the collection, *open in tracker* sits beside *go to p. N*. Otherwise the
  preview is exactly what #22 shipped.
- **Opening records the hop**, through #10's rules (`~/lit-tracker/citation-path`):
  the paper being left joins the path, a revisit cuts it back, and the step is
  labelled from the edges like any other.
- **It opens the reader**, not the citations view — the same landing a *cites*
  row gives.
- **A reference that resolves to nothing, or to a paper not in the collection,
  shows no action at all** — not a disabled one. There is nothing to press and
  nothing to explain.
- **The re-read fills older papers in**, showing the same summary row #10 built.
  Until a paper has been re-read its citations behave exactly as they do now.

## Constraints

### Data

- `citation_edges.entry_regions jsonb null`: where the entry sits in the citing
  paper — a page and its rectangles, as GROBID gives them. Null for a row with
  no parsed entry behind it (a Semantic Scholar-only reference), and for every
  row written before this feature.
- Written **only** by the bibliography writer, with the rest of the row, and
  rewritten by the re-read. Nothing else may set it.
- The column goes in `drizzle-zero.config.ts`, the regenerated `schema.gen.ts`
  and a `drizzle-kit` migration.

### Extraction

- The GROBID request adds `teiCoordinates=biblStruct` and nothing else. Its
  other fields are unchanged.
- **A paper GROBID returns without coordinates is not a failure**: the
  bibliography is written as it is today, with `entry_regions` null.

### Matching

- The rule is a **pure module**: given a previewed region and the edges of the
  open paper, which edge — if any — that region is showing.
- Matched by page and rectangle overlap, never by the reference's printed
  number or its text.
- **One edge or none.** An overlap with two entries (a preview region that
  spans the gap between them) resolves to neither: opening the wrong paper is
  worse than offering nothing.

### Security

- The article the action opens is reached through the existing owner-scoped
  queries; `cited_article_id` is already scoped to the owner on both ends
  (#10's queries). No new read path.

## Acceptance criteria

1. On a paper whose bibliography has been read with coordinates, clicking a
   citation to a paper in the collection offers *open in tracker*; pressing it
   opens that paper's reader with the path showing `… ›cites …`.
2. Clicking a citation to a paper **not** in the collection shows the preview
   with no such action.
3. Clicking a link that is not a reference at all (a table, a section) shows the
   preview with no such action.
4. A stored entry rectangle and the previewed region for the same reference
   agree on the page and overlap — checked on a real paper before the action is
   built.
5. Older papers gain their rectangles through the re-read, with its summary row
   counting down, and nothing else about their rows changes.
6. Another user's edges and articles are never reachable through the new action.
