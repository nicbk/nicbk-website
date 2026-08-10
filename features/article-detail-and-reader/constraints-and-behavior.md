# Constraints and Behavior: Article Detail and Reader

Acceptance criteria for the feature as a whole. Each task's own
`constraints-and-behavior.md` states which of these it satisfies.

## The detail page

Per
[article-detail.md](../../research/ui-ux/pages/lit-tracker/pages/article-detail.md):

- The page lives at **`/lit-tracker/$articleId`**, inside the app-shell layout
  and route guard the `/lit-tracker` group already provides. It is not a new
  shell.
- **Top: a metadata summary** — title, authors, year — below the lit-tracker
  header. Venue joins them, on the same reasoning #8 added it to the card: the
  pipeline recovers it and nothing else shows it. Any field the article lacks is
  simply absent.
- The summary carries a **three-dot menu**. It is the menu #8 built for the
  card, holding tag and reading-status controls; #11 adds "edit…" and "delete…"
  to it. A second, differently-populated menu on this page would be exactly the
  drift the reuse rule exists to prevent.
- **Main content: the PDF reader**, which is the primary task on this page and
  therefore gets the main content area.
- **Left sidebar, organized as tabs**, on the same side as the collection's
  filter rail. This feature builds **Tags**, **Notes**, and **Annotations**;
  **Citations is #10** and is not rendered as an empty or disabled tab in the
  meantime.
- **Below the breakpoint the sidebar becomes a toggleable drawer**, not a
  stacked section under the reader — stacking would put tags and notes behind a
  full document's worth of scrolling. **Open by default on wide screens,
  collapsed by default on narrow ones.** The drawer is the one #8 built for the
  filters, reused rather than reimplemented.
- An article id that does not exist, or belongs to someone else, produces the
  site's **not-found** treatment. The two cases are not distinguished to the
  user.
- The card on `/lit-tracker` **becomes a link** to this page. #8 shipped it
  without one because this route did not exist; the card's three-dot menu must
  keep working without the click reaching the link.

## Tags and Notes

- The **Tags tab** shows this article's tags as toggles, including its
  reading-status tag, and edits them through **#8's existing mutators** —
  create, attach, detach, set status. No new mutator, no second tag model. This
  is the decided "reading status is itself a tag" presentation, which #8 already
  implemented for the card menu.
- The **Notes tab** is a free-text field for the user's own notes on the
  article, writing **`articles.notes`** — the column
  [article-core-schema.md](../../research/data-modeling/article-core-schema.md)
  created for exactly this and nothing has written since.
- Notes are **kept distinct from annotations**: a note is about the paper, an
  annotation is anchored to a point in it.
- Notes **save without a save button**, consistent with the rest of the app's
  reactive model, and the field must respect the decided **editing vs
  non-editing** rule in
  [design-system.md](../../research/ui-ux/design-system.md) — a synced update
  must never overwrite what the user is in the middle of typing.

## PDF access

Per
[pdf-and-annotation-data-protection.md](../../research/security-privacy/pdf-and-annotation-data-protection.md):

- The PDF is **streamed through this app server**. **No presigned or signed
  Garage URL is issued to a client, ever** — a presigned URL grants access to
  whoever holds it, independent of this server's checks.
- The route **requires a session** and **checks ownership** before streaming.
  Ownership is checked against the article row, not inferred from the object key
  alone.
- A request for another user's article and a request for an article that does
  not exist return the **same response**. Ownership must not be discoverable
  through a status code.
- The response carries **`application/pdf`** and does not invite the browser to
  execute anything: the existing security-header posture in
  [app-security-headers.md](../../research/security-privacy/app-security-headers.md)
  continues to apply to it.

## The reader

Per
[reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md):

- Built on **EmbedPDF's headless architecture**, composing this project's own UI
  on top rather than adopting the drop-in styled component — the decision in
  [pdf-reader-annotations.md](../../research/technologies/pdf-reader-annotations.md),
  taken specifically because the prebuilt UI felt janky.
- The reader is **client-only**. PDFium is WebAssembly and the rest of this site
  renders on the server; the reader must not break SSR, and the page around it
  must still render server-side.
- A **persistent top toolbar** — not floating, not contextual — holding
  annotation tools, page navigation (previous/next plus a page indicator), and
  zoom controls.
- The reader fits the shell's **bounded, self-scrolling panel** model
  ([header.md](../../research/ui-ux/pages/lit-tracker/components/header.md)):
  the document scrolls inside its panel and the page itself does not grow a
  scrollbar.
- **Loading and failure are visible.** A PDF is megabytes and a WebAssembly
  engine has to start; the reader says it is loading, and says so distinctly
  from an article whose file cannot be fetched.

## Annotations

- The **`annotations` table** is created exactly as
  [annotations-schema.md](../../research/data-modeling/annotations-schema.md)
  specifies: `id`, `user_id`, `article_id`, `type`, `page_index`, `contents`,
  `payload jsonb`, timestamps, and the `(article_id, page_index)` index — with
  **UUIDv7 client-generated primary keys**, `timestamptz`, hard deletes, and
  **`ON DELETE CASCADE` on both foreign keys**, both being ownership
  relationships.
- The table is added to the **`zero_data` publication** and to
  `drizzle-zero.config.ts` **in the migration that creates it**, and
  `src/zero/schema.gen.ts` is regenerated — the standing rule for every synced
  table, enforced by the CI drift check.
- **Type-specific fields stay in `payload`.** Only `type`, `page_index`, and
  `contents` are promoted to columns, because only those are queried. `page_index`
  in particular must not be buried in the JSON — the sidebar's jump-to-page
  behavior reads it.
- **Neither `author` nor EmbedPDF's own `created`/`modified` are persisted.**
  The row's `user_id` and its own timestamps serve both, populated onto the
  object handed back to EmbedPDF at read time.
- **The 12 decided annotation types are exposed**: highlight, underline,
  strikeout, squiggly, ink, square, circle, line, polyline, polygon, free text,
  and sticky note. **Stamp is out of scope.**
- **Creation is tool-select-then-apply**, and the selected tool **stays active**
  for repeated use until the user switches or deselects it — not one toolbar
  pick per mark.
- **Persistence is live and automatic**: marks save as they are created, edited,
  and deleted, with no save step, and reach every other open client by sync.
- **Only committed changes are persisted.** EmbedPDF's annotation events carry a
  `committed` flag distinguishing a finished change from an in-progress one;
  writing on every event would put a row-per-frame through Zero and Postgres
  while a stroke is being dragged.
- **Existing annotations are on the paper when it opens**, imported into the
  reader once for the loaded document rather than appearing a moment later.
- Every mutator derives its owner from the **server-derived context**
  (`zeroContextFrom(session)`), never from arguments. A mutation naming another
  user's article or annotation **fails server-side and leaves no row**, verified
  non-vacuously with that user's rows genuinely present.
- Deleting an article removes its annotations by **cascade**, not by a second
  write.

## The Annotations tab

- Lists **this article's annotations**, one row each, showing a **content
  snippet and a page number**.
- A row whose annotation has no text — a shape, an ink stroke — still reads as
  something. Empty `contents` is expected for geometry-only types and the
  fallback is a UI concern, as its schema doc says.
- **Selecting the tab does not swap the main content area.** Annotations live
  inside the reader; the reader stays. This is the explicit contrast with the
  Citations tab.
- **Clicking a row moves the reader to that annotation's page.**
- The list is **live**: a mark made in the reader appears in the list without a
  refresh, and one deleted disappears from it.

## Cross-cutting quality

- WCAG 2.2 AA throughout: 4.5:1 text / 3:1 non-text contrast in both themes;
  visible focus indicators on every tab, toolbar control, and list row; the tab
  list a real tab interface to assistive technology, with the keyboard model
  that implies; accessible names on every icon-only toolbar control; annotation
  tool state conveyed by more than color.
- **The reader's own accessibility is bounded and must be stated, not glossed.**
  A canvas-rendered PDF is not accessible text, and no annotation UI makes it
  so. What is required here is that everything *around* the document — the
  toolbar, the tabs, the notes field, the annotation list — is fully operable by
  keyboard and screen reader, and that the document region is correctly labelled
  rather than silently unlabelled.
- Correct in both light and dark themes and at narrow, mid, and wide widths —
  the sidebar's drawer transition, the toolbar's control set, and the reader's
  fit are all width-dependent.
- Runs identically via `npm run dev`, the production Nitro server, and
  `docker compose up` — including the WebAssembly engine, whose asset loading is
  the part most likely to differ between a dev server and a built bundle.
- CI (Biome, typecheck incl. CSS-Module codegen and the `zero/schema.gen.ts`
  drift check, unit + integration tests with ratchet coverage, PR-title lint)
  passes. The two Playwright jobs remain suspended for the duration of this
  feature unless restored — see [testing.md](./testing.md).

## Explicitly out of scope

- **The Citations tab and the citation graph** (#10), and with them the
  **Semantic Scholar attribution** the detail page owes once S2-derived data is
  shown.
- **Editing metadata or references, and deleting an article** (#11).
- **Undo/redo**, and EmbedPDF's optional history plugin.
- **Stamp annotations**, per the schema decision.
- **Search within the PDF, thumbnails, printing, rotation, page spreads** —
  EmbedPDF plugins nothing decided asks for.
- **A download control** for the original PDF. Task 2's route exists to feed the
  reader; a visible download affordance is not specified anywhere.
- **Sharing, or any cross-user visibility**, of articles, notes, or annotations.
- **Annotation export** to a marked-up PDF file. The decided model keeps
  annotations as records beside the binary and never rewrites it.
