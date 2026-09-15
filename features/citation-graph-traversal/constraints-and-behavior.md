# Constraints and Behavior: Citation-Graph Traversal

## Behavior

### The Citations tab

- A fourth sidebar tab, **Citations**, between Notes and Annotations, with a
  glyph like the others.
- Choosing it replaces the reader with the citations view. Choosing any other
  tab brings the reader back. There is no separate "back to reader" control.
- **Which view is showing is in the URL** (`?view=citations`), because the rail
  and the narrow-screen sheet are separate sidebar instances and both must agree
  with the main area. Reload keeps it.
- On a narrow screen, choosing Citations in the sheet closes the sheet, so the
  lists it opened are what the reader sees.
- **The reader stays mounted while hidden.** Returning shows the same page at
  the same place, with no reload of the document.

### The citations view

- **Three tabs**, each with a count: *in your collection*, *cited by*, *not in
  your collection*.
- **In your collection / cited by**: title, authors, year. Activating one opens
  that paper, with the reader showing and the path extended (below).
- **Not in your collection**: the printed reference when there is one, else
  title, authors and year. With a Semantic Scholar id it is a link to
  `https://www.semanticscholar.org/paper/{id}`, opening in a new tab
  (`rel="noopener noreferrer"`), marked as external. Without one it is plain
  text.
- **Empty and incomplete are different**:
  - no rows at all: "its bibliography was not read";
  - rows, but none in the collection: "cites nothing else in your collection";
  - `reference_count` known and greater than the rows: "N of M references read".
- **A Semantic Scholar credit** is visible in the view.
- Order: in-collection and cited-by by year, newest first; outside references in
  the order stored (the paper's own order, as parsed).
- **The page's controls** (sheet trigger, article menu) come with the view: at
  the end of its tab row, or, on a narrow panel, at the end of the credit row.
- **On a narrow panel** each tab shows a glyph, its count and a short word
  (collection / cited by / elsewhere); the full label stays its accessible name
  (decided with the user at implementation, 2026-09-15).

### Older papers are re-read

Decided with the user at implementation (2026-09-14), replacing "a one-off
command":

- **Automatic on deploy.** When the worker starts, each finished article with no
  `references_read_at` is queued for a re-read, at most once at a time.
- **Shown in the upload status indicator**, next to "+", as **one summary row**:
  "re-reading references · N of M papers". The indicator shows its in-progress
  state while any paper is queued, and returns to "All articles synced" when
  the last one succeeds. The row disappears on its own.
- **A failure stays visible until it succeeds.** A paper whose re-read exhausts
  its retries keeps its previous references untouched. A warning row, "couldn't
  re-read references for N papers · their old references are kept", shows with
  **try again** and **no dismiss**. Trying again re-queues those papers.

### The way back

- **The header's title slot shows a path** ending at the open paper:
  `Attention › BERT › RoBERTa`. Earlier papers are links; the last is the current
  page (`aria-current`).
- **Each step is labelled** with how it was reached: *cites* or *cited by*,
  derived from the synced edges between neighbours. With no edge between them any
  more (a paper was deleted, a bibliography rewritten), the step is shown
  unlabelled.
- **Opening a paper from the citations view** appends the paper it was opened
  from. **If the paper opened is already on the path, the path is cut back to
  it.**
- **Following a path link** opens that paper with the path up to it.
- **Opening a paper any other way** (the collection, a pasted URL without one)
  has no path: the slot shows the title alone, as today.
- **More than three papers**: the first and the last two show, and the middle
  folds into "…", a menu listing the hidden steps with their labels. On a phone
  the path shows "…" and the current paper only.
- **Kept in the URL** as the ordered article ids before the current one
  (`?via=`), at most 20; beyond that the oldest are dropped. An id that is not
  one of the reader's articles is dropped from the display, never shown as a
  placeholder.

## Constraints

### Data

- `citation_edges.raw_text text null`: GROBID's `raw_reference` for the parsed
  entry the row came from. Null for rows with no parsed counterpart.
- `articles.reference_count integer null`: Semantic Scholar's `referenceCount`
  at enrichment. Null when not enriched.
- **Merged-row rule**, applied when a bibliography is written: drop an
  unresolved row (`cited_article_id` and `semantic_scholar_id` both null) whose
  letters-and-digits title contains the full letters-and-digits title of a
  Semantic Scholar-resolved row of the same citing article. Measured: exactly
  the two known rows on the local papers (research §4).
- `articles.references_read_at timestamptz null`: set when a bibliography is
  read by this pipeline (extraction, or the re-read). Null marks a paper read
  before it, which is what the re-read looks for. Not synced.
- **The re-read** of older papers rewrites their bibliography (edges, printed
  text, reference count) and re-runs graduation. It **never writes** `title`,
  `authors`, `publication_year`, `venue`, `doi`, `abstract`, `notes`, `status`
  or the reading position.
- New columns go in `drizzle-zero.config.ts`, the regenerated `schema.gen.ts`
  and a `drizzle-kit` migration.

### Queries

- Named queries only, scoped by `ctx` exactly like `articles.byId`:
  - `citationEdges.references(articleId)`: edges of that citing article, each
    with its cited article when set;
  - `citationEdges.citedBy(articleId)`: edges whose cited article is it, each
    with its citing article.
- Both filter `userId = ctx.id` on the edge **and** on every related article.
  Anonymous returns nothing.

### Security

- Semantic Scholar links carry `rel="noopener noreferrer"` and are built from the
  stored id, URL-encoded, never from free text.
- `via` ids are validated as UUIDs by the route's search schema, and resolved
  only through owner-scoped queries.

## Acceptance criteria

1. The Citations tab shows three lists with correct counts for *Attention Is All
   You Need* on the local stack (research §2).
2. Switching to Citations and back shows the reader at the same place, with no
   document reload (no new PDF request, and the first page is not redrawn).
3. An in-collection item opens that paper, with the reader showing and the path
   extended.
4. An outside reference with an id opens Semantic Scholar in a new tab; one
   without is not a link.
5. The credit is visible; the three empty/incomplete messages each appear for a
   paper in that state.
6. The two merged rows are gone after the re-read, and nothing else is removed.
   Existing papers gain printed text and a reference count. Edited metadata is
   unchanged. The summary row counts down and disappears; a forced failure shows
   the warning row, which only a successful try again removes.
7. Another user's edges and articles never appear (integration tests).
8. The path: A → B → C shows `A › B › C` with labels; opening A from C cuts it to
   `A`; a fourth and fifth hop fold the middle; reload and back keep it; a phone
   width shows "…" and the current paper.
9. Chrome at desktop and phone widths; Safari on `nicbk.com` after deploy.
