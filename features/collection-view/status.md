# Status: Collection View

**Feature state:** **In progress** — 3 of 4 tasks merged, the fourth
implemented and awaiting review. Four tasks,
sequential, each gated by its own PR + CI + human review. Depends on
[`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7, Complete) — it consumes that feature's Zero bring-up, `/query` and
`/mutate` endpoints, `articles` table, `/lit-tracker` route group, app shell,
sidebar rail, and collection toolbar, and gives **`/mutate` its first
consumer**.

Feature parent issue: [**#81**](https://github.com/nicbk/nicbk-website/issues/81),
with one sub-issue per task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#8** in [../index.md](../index.md). When the feature
completes, its parent issue **must be closed by hand** — GitHub does not close a
parent when its sub-issues close.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`article-cards`](./tasks/article-cards/status.md) ([#82](https://github.com/nicbk/nicbk-website/issues/82)) | **Merged** | [#86](https://github.com/nicbk/nicbk-website/pull/86) | Green | Merged 2026-08-09 |
| [`tags-and-reading-status`](./tasks/tags-and-reading-status/status.md) ([#83](https://github.com/nicbk/nicbk-website/issues/83)) | **Merged** | [#88](https://github.com/nicbk/nicbk-website/pull/88) | Green | Merged 2026-08-09 |
| [`collection-filters`](./tasks/collection-filters/status.md) ([#84](https://github.com/nicbk/nicbk-website/issues/84)) | **Merged** | [#90](https://github.com/nicbk/nicbk-website/pull/90) | Green | Merged 2026-08-09 |
| [`collection-search`](./tasks/collection-search/status.md) ([#85](https://github.com/nicbk/nicbk-website/issues/85)) | Implemented | — | — | — |

One change landed outside this table: the Playwright suites were unchecked by
`tsc`, a gap [research.md](./research.md) recorded for whichever task touched
`e2e/` first. It was closed as its own chore PR,
[#87](https://github.com/nicbk/nicbk-website/pull/87), rather than inside task 2
— a build-config change plus eight unrelated fixes had no business sharing a
diff with the write path's authorization. Task 2 also produced a docs-only PR,
[#89](https://github.com/nicbk/nicbk-website/pull/89), adding AGENTS.md's
"Design UI that is simple and pleasant to use" section after a run of
clunky-interface corrections.

That e2e work went out the same way: the signed-in tier was taking about ten
minutes because all 88 of its tests drove a full OAuth round trip before
starting, and [#91](https://github.com/nicbk/nicbk-website/pull/91) replaced that
with a single `storageState` sign-in — measured at 5.7 minutes down to 4.5.

**It did not go far enough, and during task 4 the user suspended both e2e jobs in
CI** until the Lit Tracker is built out: fifteen minutes per PR on surfaces whose
shape changes every task is the slowest feedback loop in the project applied at
its least useful moment. Per-PR gating is now Biome, typecheck, the drift checks,
the unit tier, the coverage ratchet, and integration. The specs stay committed
and run on demand. Reasoning and restore instructions:
[e2e-testing.md](../../research/testing-qa/e2e-testing.md) (2026-08-09
addendum) — note that this also suspends every axe scan, since all of them live
inside Playwright tests.

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
- 2026-08-09 — Spec reviewed and merged (PR #80); parent issue #81 and
  sub-issues #82–#85 filed. **Task 1 merged** (PR #86). The browser pass on it
  changed the decided presentation in three ways — a uniform grid, elided text
  with the full string on hover, and a content column that fills the panel —
  all recorded as a dated revision in `collection-view.md` rather than as local
  fixes, since they are decisions about the page rather than about that task.
- 2026-08-09 — **Task 4 implemented**, finishing the feature's build. The search
  bar fills the slot #7 reserved, the grid reveals a batch at a time, and the
  toolbar's cluster is centred and sticky — the last of those raised after
  scrolling the real page, since infinite scroll had put the search bar and the
  "+" out of reach of anyone deep in a collection. Also this task, and larger
  than it: **the two e2e jobs are suspended in CI** at the user's direction, so
  every PR from here until the tracker is built out gates on the unit tier, the
  drift checks, and the integration tier alone.
- 2026-08-09 — **Task 3 merged** (PR #90), and the e2e speed-up it queued merged
  behind it (PR #91). Task 3's browser pass changed three decided things — the
  rail becomes a drawer below the breakpoint, the account avatar returns to the
  header, and deleting a tag is a mode rather than a control per row — each
  recorded as a dated revision in the research docs that own them.
- 2026-08-09 — **Task 2 started.** Its one open item and two smaller forks
  settled with the user first: a rejected mutation surfaces through a **shared
  toast** built on Base UI's `Toast` under `src/routes/-shared/components/` (the
  pattern `design-system.md` already decided for an error with no form to attach
  to); the card's elided lines **move from the native `title` attribute to Base
  UI's `Tooltip`**, now that the card is interactive regardless; and the
  Playwright typecheck gap went out as its own chore PR (#87) rather than into
  this task's diff.
