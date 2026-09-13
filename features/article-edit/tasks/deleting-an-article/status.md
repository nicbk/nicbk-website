# Status: Deleting an Article

**State:** Not started. Task 2 of 3.

- Branch: `article-edit/deleting-an-article`, from `main` with task 1 merged —
  the two touch the same popover, and sequencing them is cheaper than resolving
  it twice.
- Sub-issue: [**#142**](https://github.com/nicbk/nicbk-website/issues/142).
- PR: opened once the unit and integration tiers and the browser pass are clean.

## Why this task exists

There is no way to remove an article from the collection at all. There is also no
way to remove the PDF behind one, because `pdf-storage.ts` has never had a
delete: everything this project has built so far only ever added.

## Open items to settle while writing

- **The commit-to-enqueue window, decided out loud.** pg-boss sends on its own
  connection, so the cleanup enqueue is not inside the transaction that deleted
  the row, and a crash between them orphans an object. `extract-stage.ts` accepts
  the mirror-image window already, which is precedent for accepting it here with
  a sentence. The alternative is recording the intent transactionally and
  draining it. **Whichever is chosen goes in this file** — the failure this task
  must not ship is the one nobody decided about.
- **Where the server half hangs the cleanup.** `/api/zero/mutate` resolves each
  mutator by name from the shared registry, which is the seam where a
  server-only follow-up could live. Whether that is a wrapper at the endpoint or
  something narrower is unsettled; what is settled is that it cannot be in the
  shared mutator, which the browser runs too.
- **What the detail page does when its own article is deleted.** Deleting from
  the card is obvious; deleting from the page that is rendering the article
  leaves the reader somewhere that no longer exists. Leaving for the collection
  is the assumption, and the browser pass is where it gets judged.

## Log

- 2026-09-12 — Filed with the feature.
