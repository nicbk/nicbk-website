# Status: The Folds Are Kept

**State:** Merged ([#259](https://github.com/nicbk/nicbk-website/issues/259); PR [#261](https://github.com/nicbk/nicbk-website/pull/261)).

## What shipped

- **`article_contents.expanded`**: a nullable `jsonb` `number[]`, where null
  means never folded.
  - Its migration is `0010_contents_folds.sql`. The table was already in the
    `zero_data` publication, so the column needs nothing more.
  - It is listed in `drizzle-zero.config.ts`, which names columns one by one;
    without that, the regenerated Zero schema would not carry it.
- **`articleContents.setExpanded({ articleId, index, open })`** in
  `src/zero/mutators.ts`:
  - it reads the row under the caller's id, and refuses another user's row, an
    anonymous caller, and an index past the entries;
  - it writes `foldsAfter(...)` and leaves `updated_at` alone;
  - opening an open entry changes nothing.
- **`foldsAfter`** joined the rest of the fold rules, which moved from the route
  folder to `src/lit-tracker/contents/contents-tree.ts`. The mutator runs in the
  browser and on the server, so both must compute the first-visit view with the
  code the panel uses.
- **The upload's rewrite** (`extract-stage.ts`) sets `expanded` back to null in
  the same `onConflictDoUpdate`.
- **The panel** takes the open set from the synced row (`contents-view.ts`
  carries `expanded`) and hands a press to the sidebar (`onFold`). The sidebar
  calls `setContentsFold` from `use-article-mutations.ts`; a refusal is a
  toast. Task 1's in-memory store (`use-contents-folds.ts`) is gone.

## Verification

- **Unit:**
  - `foldsAfter`: the first press starts from the first-visit view; `[]` is
    kept apart from null;
  - the mutator: the write, the first press, idempotence, six refusals;
  - the view carries `expanded`;
  - the sidebar sends the right mutation;
  - the extract stage's rewrite carries `expanded: null`.
- **Integration (real Postgres):**
  - the column starts null and keeps "never folded" apart from "all closed";
  - `updated_at` is unchanged;
  - another user's row is refused and left alone;
  - an index past the end and an anonymous caller are refused;
  - an extract-stage replay over folded contents leaves `expanded` null.
- **Browser (Chromium, 2026-10-14)**, on a fresh stack with the migration
  applied:
  - the first view of the textbook is its twelve chapters;
  - with *Chapter 3* and *3.2* opened, 20 rows show: the same after a reload,
    and the same in the 375px sheet;
  - a second browser context signed in to the same account saw *Chapter 5*
    open (20 → 25 rows) and close again, without a reload;
  - the lone-root book's root, once closed, stays closed after a reload, and
    the textbook's folds are untouched by it;
  - jumping to *3.2.1* and closing *Chapter 3* marks *Chapter 3*; reopening it
    marks *3.2.1*.

## Log

- 2026-10-14: merged.
- 2026-10-14: implemented and verified.
- 2026-10-14: spec'd.
