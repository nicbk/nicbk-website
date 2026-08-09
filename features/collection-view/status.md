# Status: Collection View

**Feature state:** **Spec'd, awaiting review.** Four tasks, sequential, each
gated by its own PR + CI + human review. Depends on
[`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7, Complete) — it consumes that feature's Zero bring-up, `/query` and
`/mutate` endpoints, `articles` table, `/lit-tracker` route group, app shell,
sidebar rail, and collection toolbar, and gives **`/mutate` its first
consumer**.

Feature parent issue and task sub-issues: **not yet filed** — they are created
once this spec is reviewed and merged, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#8** in [../index.md](../index.md). When the feature
completes, its parent issue **must be closed by hand** — GitHub does not close a
parent when its sub-issues close.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`article-cards`](./tasks/article-cards/status.md) | Not started | — | — | — |
| [`tags-and-reading-status`](./tasks/tags-and-reading-status/status.md) | Not started | — | — | — |
| [`collection-filters`](./tasks/collection-filters/status.md) | Not started | — | — | — |
| [`collection-search`](./tasks/collection-search/status.md) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met and each task
merged behind its own passing CI + human review. In short: a signed-in user
opens `/lit-tracker` and sees their collection as cards carrying everything #7
extracted; they tag a paper and mark it `reading` from the card's menu, and both
appear in another open window with no refresh; they narrow the grid from the
rail, or by typing in the search bar, and the narrowed view is a shareable URL;
long collections reveal as they scroll. Underneath: `tags` and `article_tags`
are synced tables, and every write goes through a Zero mutator authorized by the
same server-derived context `/query` uses — proven, with another user's rows
present, to refuse a write it does not own.

## Notes carried into implementation

- **`/mutate` is the write half of the authorization boundary, and this feature
  is its first consumer.** Derive the owner from `zeroContextFrom(session)`,
  never from mutator arguments, and prove non-vacuously that a write aimed at
  another user's row does not land. A client's optimistic copy will happily
  apply it; the server is the only thing that says no.
- **Build on the blog list, not beside it.** `SearchInput`, `TagFilter`,
  `useBlogFilters`'s URL-mirroring shape, `filterPosts`, and
  `useIncrementalReveal` all exist and are cited by the decided spec as the
  precedent this page follows. Extract and share what genuinely fits rather than
  writing a second copy — two filter implementations are exactly the drift the
  duplication rule exists to prevent.
- **`ArticleCollection` is upgraded, not replaced.** The syncing/ready/error
  split, the empty-state wording, and `formatAuthors` all survive; what changes
  is how a row is drawn.
- **Container queries on the card, media queries on the page.** The decided
  design system names the article card as *the* container-query example and the
  lit-tracker rail as *the* media-query example. Getting these the wrong way
  round is the standard mistake here.
- **The three reading statuses are synthesized in the UI.** They are not rows in
  `tags`; nothing seeds them; they must nonetheless render and behave
  identically to real tags apart from being undeletable and mutually exclusive.
- **New synced tables must extend the `zero_data` publication and
  `drizzle-zero.config.ts` in the same migration**, then regenerate
  `src/zero/schema.gen.ts`. The CI drift check catches the last step, not the
  first two.
- **Separated type imports**, as everywhere: this feature crosses the
  client/server boundary in a new direction, and an inline type import leaves a
  surviving side-effect import.
- **Verify in a second window, not a second tab.** Zero drops sync for a hidden
  document; a background tab looks exactly like broken sync and is not.
- Re-verify Zero's mutator API against the installed package before writing task
  2 (research-over-recall). It was checked at spec time — see
  [research.md](./research.md) — but that check ages.

## Log

- 2026-08-09 — Feature spec'd, immediately after #7 completed and its parent
  issue was closed. Scoping settled with the user beforehand: **four tasks**,
  with the card first and the write path isolated in its own reviewable task;
  **#8 owns applying tags and setting reading status** (the decided docs route
  both through #11's `article-edit`, which is not scheduled before this feature —
  taken literally, that would ship a tag filter over a tag set the user cannot
  populate); **venue joins the card's field list**, since #7 now recovers it
  reliably and nothing displays it; and the **"+" button and status indicator sit
  immediately against the search input's trailing edge** rather than at the
  content column's far edge. Also confirmed at spec time, per
  research-over-recall: Zero 1.8.0's `defineMutator`/`defineMutators` shape and
  its server-side dispatch match the placeholder `mutate-endpoint.ts` already
  carries, and Base UI 1.6 ships the menu, toggle-group, combobox, and toast
  primitives this feature needs. Awaiting spec review, then GitHub issues and
  task 1.
