# Status: Article Edit

**Feature state:** **In progress** — task 1 implemented and in review, spec written 2026-09-12 against `main` at
`ed65c9f`, from the interface decided 2026-07-02 and from reading the code that
was built expecting it. Three tasks, each gated by its PR + CI + human review.

Depends on [`article-upload-and-extraction`](../article-upload-and-extraction/status.md)
(#7, Complete) for the rows, the failure path and the storage this edits, and on
[`collection-view`](../collection-view/status.md) (#8, Complete) for the menu it
hangs from.

Feature parent issue: [**#140**](https://github.com/nicbk/nicbk-website/issues/140),
with one sub-issue per task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#11** in [../index.md](../index.md). Its parent issue
should be **checked** when the feature completes, and closed by hand if it has
not closed itself — as of that document's 2026-09-12 addendum the auto-close
happens *sometimes*, so either answer is expected.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`editing-an-articles-details`](./tasks/editing-an-articles-details/status.md) | Implemented | [#145](https://github.com/nicbk/nicbk-website/pull/145) | — | — |
| [`deleting-an-article`](./tasks/deleting-an-article/status.md) | Not started | — | — | — |
| [`resolving-a-failed-upload`](./tasks/resolving-a-failed-upload/status.md) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, all three tasks
merged behind passing CI + human review. In short: a reader can correct what the
extractor got wrong, remove a paper they did not mean to keep — bytes included —
and answer the warning icon that has never had an answer.

## Notes carried into implementation

- **The interface was decided before the code existed, and the code was built
  for it.** `ArticleMenu`'s doc comment names this feature by number and says
  where its two controls go. Build there; do not add a second control beside it.
- **A failed extraction still produces an article** — filename for a title,
  `authors: []`, `extraction_status: 'failed'` — and its `upload_jobs` row stays
  deliberately, because it is the only thing telling the reader the upload needs
  them. That row is the thing task 3 retires.
- **Delete clears the warning for free** (`upload_jobs.article_id` cascades);
  **edit does not**, and missing that ships a permanent warning over a fixed
  article.
- **A mutator cannot delete a blob.** Every mutator here also runs in the
  browser. The row delete stays a mutator; the object delete is a pg-boss job the
  server half enqueues — decided with the user on 2026-09-12, with the
  commit-to-enqueue window named rather than hidden.
- **Reference editing is deferred to #10**, with the Citations tab that displays
  references and the matching logic that graduates them. Decided with the user
  the same day, and recorded in the feature's own files so the deferral does not
  read as an omission.
- **`extraction_status` survives a hand edit.** It remembers the outcome; the job
  table tracks the process. Adding a `'manual'` value was considered and
  rejected.
- **Twelve authors, not two.** The author list is where this feature's design
  risk lives, and a layout checked against a two-author paper has not been
  checked.

## Log

- 2026-09-12 — **Task 1 implemented.** The edit form, its mutator and "edit…" on
  the existing menu. Two defects were caught before review rather than after: a
  save control that fell below the fold of a desktop window on a paper with
  fourteen authors, found by seeding realistic content in the browser, and a form
  that reopened holding the draft abandoned last time, found by a test written
  because reopening is a thing readers do.
- 2026-09-12 — **Spec'd**, after #13 completed. Researched first: the decided
  interface, the schema doc that pinned its deferred field list, and — the part
  that changed the plan — `recordOutcome`'s real failure path, which showed that
  the article already exists, that delete clears the warning for free, and that
  edit does not. Three open decisions were settled with the user before any file
  was written: references deferred to #10, a pg-boss job for the blob cleanup,
  and an author list rather than a comma-separated field.
