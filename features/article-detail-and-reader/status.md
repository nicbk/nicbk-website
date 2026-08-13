# Status: Article Detail and Reader

**Feature state:** **In progress** — tasks 1 and 2 merged, task 3 implemented and awaiting review. Five tasks, sequential, each gated by its own PR + CI + human review.
Depends on [`collection-view`](../collection-view/status.md) (#8, Complete) for
the card this page is reached from, the tag model its Tags tab presents, and the
drawer its sidebar becomes; and on
[`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7, Complete) for the PDFs in Garage, `articles.notes`, and the app shell.

Feature parent issue: [**#95**](https://github.com/nicbk/nicbk-website/issues/95),
with one sub-issue per task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#9** in [../index.md](../index.md). When the feature
completes, its parent issue **must be closed by hand** — GitHub does not close a
parent when its sub-issues close.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`article-detail-shell`](./tasks/article-detail-shell/status.md) ([#96](https://github.com/nicbk/nicbk-website/issues/96)) | **Merged** | [#101](https://github.com/nicbk/nicbk-website/pull/101) | Green | Merged 2026-08-13 |
| [`pdf-serving`](./tasks/pdf-serving/status.md) ([#97](https://github.com/nicbk/nicbk-website/issues/97)) | **Merged** | [#102](https://github.com/nicbk/nicbk-website/pull/102) | Green | Merged 2026-08-13 |
| [`pdf-reader`](./tasks/pdf-reader/status.md) ([#98](https://github.com/nicbk/nicbk-website/issues/98)) | **Implemented** | [#103](https://github.com/nicbk/nicbk-website/pull/103) | — | Awaiting review |
| [`annotations`](./tasks/annotations/status.md) ([#99](https://github.com/nicbk/nicbk-website/issues/99)) | Not started | — | — | — |
| [`annotations-sidebar`](./tasks/annotations-sidebar/status.md) ([#100](https://github.com/nicbk/nicbk-website/issues/100)) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met and each task
merged behind its own passing CI + human review. In short: a signed-in user
clicks a card and lands on the paper; the PDF renders in the main area, served
through this app server after an ownership check and never through a presigned
URL; they highlight a passage and circle a figure, and both marks are on the
paper in another open window and after a reload; the sidebar carries the
article's tags and their own notes, and lists the marks with a click that jumps
the reader to the right page. Underneath: `annotations` is a synced table whose
every write goes through a Zero mutator authorized by the same server-derived
context `/query` uses — proven, with another user's rows present, to refuse a
write it does not own.

## Notes carried into implementation

- ~~**The reader is the only real unknown, and task 3 must treat it as one.**~~
  **Answered in task 3**: the fallback was the answer — `ClientOnly` +
  `React.lazy`, verified against the running app before anything was built on it.
  What task 3 did *not* anticipate is in its
  [status.md](./tasks/pdf-reader/status.md): a `blob:` worker cannot resolve a
  root-relative wasm URL, `useScroll` reports 0 pages until the first page
  change, and the decided CSP blocks the engine three ways.
- **Re-verify EmbedPDF's API against the installed version in task 4.** It moved
  between the 2026-07-02 technology decision and this spec — document-scoped
  hooks, page-index arguments, two new required peer plugins — and it shipped a
  release the day before this was written.
  [research.md](./research.md) records what changed and what did not.
- **Only committed annotation events are persisted.** Otherwise a dragged ink
  stroke writes a row per frame through an optimistic client, a websocket, and
  Postgres.
- **The PDF route returns the same response for "not yours" and "not there".**
  Distinguishing them makes article ids enumerable. This is a security
  requirement wearing the clothes of an error path.
- **Reuse #8's menu, toggles, mutators, and drawer.** The Tags tab is a second
  presentation of a working model, not a second model. A separately-populated
  menu on this page is exactly the drift the duplication rule prevents.
- **`articles.notes` already exists.** No migration for the Notes tab — one
  mutator, one column that has been waiting since #7.
- **New synced tables must extend the `zero_data` publication and
  `drizzle-zero.config.ts` in the same migration**, then regenerate
  `src/zero/schema.gen.ts`. The CI drift check catches the last step, not the
  first two.
- **Verify in a second window, not a second tab.** Zero drops sync for a hidden
  document; a background tab looks exactly like broken sync and is not.
- **Both Playwright tiers are suspended**, and with them every axe scan. This
  feature's canvas is the least unit-testable artifact the project has produced,
  so the browser pass is primary evidence and each task's status must record
  what was exercised by hand.
- ~~**Watch the coverage ratchet in task 3.**~~ It held: extracting the reader's
  logic into `reader-plugins.ts`, `reader-state.ts`, `use-page-field.ts`,
  `zoom-presets.ts` and `wasm-url.ts` left coverage at **91.97%**, above the
  91.84% baseline. The prescription worked; the same one applies to task 4.
- **Task 4 inherits a toolbar with a slot in it, not a row to redesign.** The
  annotation tools go in the reserved gap between the page and zoom groups. It
  also inherits the engine's plugin list in one place (`reader-plugins.ts`),
  where the annotation plugin and its two required peers are added.
- **Separated type imports**, as everywhere.

## Log

- 2026-08-09 — Feature spec'd, immediately after #8 completed and its parent
  issue was closed. Scoping settled with the user beforehand: **five tasks**,
  splitting PDF serving from the viewer so the ownership check is reviewed away
  from WebAssembly mounting, and splitting the annotations list from annotation
  persistence; and **Citations deferred to #10** rather than shipped here as a
  bibliography list that #10 would rebuild — which also carries the Semantic
  Scholar attribution to #10 with the data that triggers it. Undo/redo raised
  and left out: EmbedPDF offers it, nothing decided asks for it, and annotations
  are already individually deletable. Re-verified at spec time, per
  research-over-recall: **EmbedPDF 2.15.0** (published 2026-08-08, with a 3.0
  prerelease not being adopted), its annotation API now document-scoped with
  page-index arguments and two new required peer plugins, and — the finding that
  changed the design rather than the imports — **`onAnnotationEvent` carries a
  `committed` flag** that persistence must gate on. The decided
  `annotations-schema.md` needed no revision. Awaiting spec review, then GitHub
  issues and task 1.
- 2026-08-13 — **Task 1 implemented.** Two design calls came out of the browser
  pass rather than the plan, both raised by the user: the card's whole surface
  opens the article rather than a stretched-anchor overlay that left the tag
  strip dead, and the sidebar's controls adapt to the rail by **container
  query** instead of the rail widening to fit them — the reader keeps its width
  and the rail stays the same size on both routes. Also this task, and larger
  than it: the card menu, the write path, and the narrow-screen drawer all moved
  out of `-collection-page/` so two pages share one of each.
- 2026-08-13 — **Task 1 merged** (PR #101), and **task 2 implemented**. Its three
  open items were settled first: the URL is
  `/api/lit-tracker/articles/{articleId}/pdf`, a refusal is a 404 for *not
  yours*, *not there*, and *malformed* alike with a 401 for anonymous, and
  streaming needed no fallback — a TanStack Start handler returns a web
  `Response`, and the S3 body's `transformToWebStream()` is `Readable.toWeb()`,
  confirmed in `@smithy/core`'s source rather than assumed from docs. The spec
  did not anticipate that a malformed id would reach a `uuid` column and raise
  `22P02`, giving a 500 where a well-formed unknown id gives a 404 — the shape is
  now checked before the query, which is the difference between three
  indistinguishable refusals and two. The browser pass confirmed the rule this
  task exists for: opening a paper made **two requests, neither to Garage**.
- 2026-08-13 — **Task 2 merged** (PR #102), and **task 3 implemented** — the
  feature's one genuine unknown, cleared first and against the running app, as
  the plan demanded. The reader mounts client-only through the same
  `ClientOnly` + `React.lazy` pattern Zero uses, on EmbedPDF 2.15.0 pinned
  exactly, with its WebAssembly engine **self-hosted** because the decided CSP
  and this site's no-CDN posture leave no alternative. Three findings the spec
  could not have predicted are in the task's
  [status.md](./tasks/pdf-reader/status.md); one of them amends a decided
  research doc, because the CSP as written would block this reader outright and
  the person to tell is whoever implements that middleware.

  **The page's shape changed mid-task, with the user.** The decided metadata
  header cost roughly a fifth of the panel to state three facts on the one page
  meant to show a document, so the title moved into the tracker header beside the
  app name, the authors and venue into the three-dot menu, and that menu and the
  sidebar trigger into the reader's toolbar — which now floats over the document
  rather than sitting above it. Three decided documents carry revisions of the
  same date: [header.md](../../research/ui-ux/pages/lit-tracker/components/header.md)
  (including what it leaves #10 to decide about citation-graph hops),
  [article-detail.md](../../research/ui-ux/pages/lit-tracker/pages/article-detail.md),
  and [reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md).
  The browser pass earned its keep twice over: it found a horizontal overflow
  that took the whole shell sideways at 420px — an uncapped grid **column** in
  `lit-tracker-shell`, not a reader bug — and a paint-order trap where the
  obvious fix would have opened every popup underneath its own trigger.
