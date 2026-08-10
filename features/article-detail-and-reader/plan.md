# Plan: Article Detail and Reader

## Approach

Build **the room before the furniture, and the furniture before the tools**:
the page and its sidebar first, then the bytes that fill it, then the reader
that draws them, then the marks a reader makes, then the list of those marks.

Each task is a vertical slice that leaves the page usable, and each is gated by
its own PR + CI + human review before the next begins.

Two things shape the ordering more than the rest.

**The reader is the feature's only genuine unknown.** Everything else here is a
variation on something the project has already done — a route, an authorized
handler, a synced table, a tabbed panel. EmbedPDF is not: it is a WebAssembly
engine that has to mount inside a server-rendered app, and its API has moved
since the technology was chosen. So the reader is isolated in a task that does
nothing else, and the task before it delivers the bytes independently — a PDF
route that can be verified by opening a URL, with no viewer in the way. If the
reader fights the framework, that is discovered against a working, provably
correct data source rather than against two unknowns at once.

**Writes come after reads, again.** The annotations task carries a new synced
table, new mutators, and a new authorization surface, and it deserves a review
of its own rather than one shared with a zoom control. The reader task is
deliberately view-only so the annotations diff is almost entirely about
persistence and ownership.

## Task breakdown and sequence

Tasks are sequential — one open at a time, each gated by its own PR + CI +
human review.

1. **[`article-detail-shell`](./tasks/article-detail-shell/description.md)** —
   The `/lit-tracker/$articleId` route: the metadata summary across the top, the
   tabbed left sidebar with **Tags** and **Notes**, and the drawer that sidebar
   becomes below the breakpoint (open by default wide, collapsed narrow). Tags
   reuse #8's toggles and mutators unchanged; Notes writes `articles.notes`
   through one new mutator. The card becomes a link. The main content area is a
   placeholder that says the reader is coming — the same honest-placeholder
   approach #7 took with the search slot. Exit state: every article has a page,
   reachable from its card, with everything about it except the paper itself.

2. **[`pdf-serving`](./tasks/pdf-serving/description.md)** — An authorized route
   that streams an article's PDF out of Garage: session required, ownership
   checked, correct content type, and a 404 that does not distinguish "not
   yours" from "not there". No UI. `getArticlePdf` and `isOwnedBy` already
   exist; this is the caller they were written for. Exit state: a signed-in user
   can open their own PDF at a URL and cannot open anyone else's.

3. **[`pdf-reader`](./tasks/pdf-reader/description.md)** — EmbedPDF's headless
   build in the main content area, loading from task 2's route, mounted
   client-only because PDFium is WebAssembly. The decided persistent toolbar
   with page navigation, a page indicator, and zoom. **View only** — no
   annotation tools yet. Exit state: the paper is readable, scrollable, and
   zoomable inside the app shell, at every width and in both themes.

4. **[`annotations`](./tasks/annotations/description.md)** — The `annotations`
   table (plus the `zero_data` publication, `drizzle-zero.config.ts`, and the
   generated Zero schema, in one migration), its mutators, the toolbar's
   annotation tools, and the two-way bridge between EmbedPDF's `AnnotationScope`
   and Zero: existing marks imported when the document loads, new ones persisted
   when EmbedPDF reports them **committed**. Exit state: a highlight drawn in
   one window is on the paper in another, and survives a reload.

5. **[`annotations-sidebar`](./tasks/annotations-sidebar/description.md)** — The
   sidebar's third tab becomes a fourth: this article's annotations as a list,
   each row a snippet and a page number, each click a jump to that page in the
   reader — **without** swapping the main content, which is what distinguishes
   this tab from the Citations tab #10 will add beside it. Exit state: the full
   decided detail page, minus the citation graph.

## Sequencing rationale

- **The shell first**, because it is the only task with no new technology in it
  at all — a route, a tab list, and one mutator, all built from parts #8 left
  behind. It also makes every later task demoable: from task 1 onward there is a
  page to put things on, rather than a reader with nowhere to live.
- **Bytes before the viewer.** A PDF route is verifiable on its own — open the
  URL, get the paper — and it is the half of the reader that carries the
  security requirement. Bundled into the viewer task, an ownership bug would be
  reviewed alongside WebAssembly mounting problems, and the diff that matters
  least would be the one that fills the screen.
- **The viewer before the marks**, because a mark is anchored to a page, and
  "the page it is anchored to" is exactly what the viewer task establishes.
  Writing persistence against a reader that does not yet render would mean
  designing the anchor from the schema rather than from the thing being
  anchored.
- **The annotations list last**, because it is a projection of rows that must
  exist first, and because it is the only part whose interaction — click a row,
  move the reader — spans both halves of the page.

## What this feature deliberately does not introduce

- **The Citations tab and the citation graph** (#10). The decided sidebar has
  four tabs; this feature builds three. `citation_edges` has been synced since
  #7 and stays invisible for one more feature, and the **Semantic Scholar
  attribution** the detail page owes goes in with the S2-derived data that
  requires it.
- **Editing metadata, editing references, and deleting an article** (#11). The
  detail page's decided three-dot menu opens `article-edit`, which is that
  feature; this page carries the menu #8 already built (tags and reading status)
  and #11 extends it.
- **Undo/redo in the reader.** EmbedPDF ships an optional history plugin, and
  nothing decided asks for it. Annotations sync live and each is individually
  deletable, so an undo stack would be a second way to do one thing — the
  "prefer removing to adding" rule in [AGENTS.md](../../AGENTS.md). Raised with
  the user at spec time rather than silently dropped.
- **Stamp annotations.** Out of scope by decision — the one EmbedPDF type
  needing binary payload storage, excluded in
  [annotations-schema.md](../../research/data-modeling/annotations-schema.md).
- **Full-text search inside the PDF**, thumbnails, printing, rotation, and page
  spreads. EmbedPDF has plugins for all of them; nothing decided asks for any of
  them, and each would be a UI decision with no decision behind it.
- **Sharing an article or its annotations.** Every table here is single-owner,
  per
  [data-sharing-boundaries.md](../../research/system-architecture/data-sharing-boundaries.md).
- **Downloading the original PDF.** Task 2's route serves the reader; whether a
  visible download control should exist is not decided anywhere, so none is
  added.
