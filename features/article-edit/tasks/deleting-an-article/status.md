# Status: Deleting an Article

**State:** In progress. Task 2 of 3.

- Branch: `article-edit/deleting-an-article`, from `main` at `23a6db9` with task
  1 merged — the two touch the same popover, and sequencing them is cheaper than
  resolving it twice.
- Sub-issue: [**#142**](https://github.com/nicbk/nicbk-website/issues/142).
- PR: opened once the unit and integration tiers and the browser pass are clean.

## Why this task exists

There is no way to remove an article from the collection at all. There is also no
way to remove the PDF behind one, because `pdf-storage.ts` has never had a
delete: everything this project has built so far only ever added.

## Open items, settled

### The commit-to-enqueue window: there isn't one

**The premise this task was filed on was wrong**, and finding that out changed
the design rather than confirming it. The task assumed pg-boss sends on its own
connection, so the cleanup enqueue could not be in the transaction that deleted
the row, and that the choice was between accepting an orphan window or building
something to drain intents.

`extract-stage.ts:285` already does the thing that was assumed impossible:

```ts
await services.queue.send(ENRICH_QUEUE, enrich, { db: fromDrizzle(tx, sql) })
```

pg-boss 12 accepts a database handle per send, and this project has been sending
transactionally since #7. So the cleanup enqueue goes in the same transaction as
the row delete, and **there is no window to accept**. The precedent
`extract-stage.ts` sets is the opposite of the one the task expected to cite.

What remains is not a window but an ordering, and it is deliberate: the row and
the queue entry commit together, then the object is deleted afterwards by the
handler. The two systems cannot be made atomic, so one residue is possible —
an object with no row, if the cleanup exhausts its five retries. That is a few
megabytes nobody can reach, and it fails loudly in pg-boss's failed-job table.
The residue in the other direction, a row whose PDF is gone, would be a visible
broken article the reader cannot fix.

### Where the server half hangs the cleanup: a registry at the endpoint

`src/zero/server-effects.ts`, keyed by mutator name, called from inside
`respondToZeroMutate`'s `transact` callback with the transaction the mutator just
wrote through.

**Zero's own documented pattern was considered and rejected**, which is worth
recording because it looks like the obvious answer: a `tx.location === 'server'`
branch inside the shared mutator, reaching `tx.dbTransaction.wrappedTransaction`.
The problem is not Zero's, it is bundling — the branch still needs
`import { fromDrizzle } from 'pg-boss'` at the top of `mutators.ts`, and a dead
branch does not undo an import. `mutators.ts` is in the browser bundle.

The registry keys off `mutators.articles.delete.mutatorName` rather than a string
literal, so renaming the mutator moves its effect with it. A detached effect is a
PDF that is never deleted and nothing that fails when it happens.

`src/zero/mutators.bundle.test.ts` is the guard: it walks the import graph from
`mutators.ts` and fails if it reaches the storage client, the S3 SDK, pg-boss,
the database, the validated environment, or the effect registry itself. Type-only
imports are skipped — they are erased, and the project already relies on that
(`ownership.ts` reaches the session type through a chain ending at the database).
A third case walks `server-effects.ts` and asserts it *is* caught, so the guard
cannot quietly stop guarding.

### What the detail page does: it leaves, immediately

Navigates to the collection as the write is sent, rather than waiting for the
server. Zero applies the delete to the local copy at once, so waiting would drop
the page into its own "no such article in your collection" branch — a dead end
shown to the reader who just asked for the deletion, which reads as a failure
rather than as the thing working. A refusal arrives afterwards as a toast.

The card behaves the same way, so there is one answer rather than two. **This is
a deviation from this task's `testing.md`**, which asked that a failed delete
leave the typed text in place for a one-click retry: there is no form left to
leave it in, because the confirmation closes with the write. (User-decided
2026-09-13.)

### What the reader types: `delete`, not the title

The task spec said the article's title. The decided UI doc
(research/ui-ux/pages/lit-tracker/components/article-edit.md) says only "the same
exact-text-match pattern" as delete-account, and notes an article is
lower-stakes than an account — the phrase was this task's choice, not the
document's.

Paper titles are sentences; a survey's runs past twenty words. Asking one back
would be transcription long enough that every reader would paste it, which is
exactly the deliberation the pattern exists to buy. A short word nobody types by
accident keeps it a deliberate act. `matchesConfirmation` is imported unchanged,
so the comparison is still the one unforgiving `===` the account flow uses.
(User-decided 2026-09-13.)

## What shipped

- **`articles.delete`** — one guarded write on the database's own cascades.
  Annotations, tag links, the edges this paper's bibliography produced and its
  `upload_jobs` row all go with it, which is also how deleting a failed upload
  clears its warning. Edges from *other* papers that had graduated to point at it
  revert to unresolved (`cited_article_id ON DELETE SET NULL`) rather than
  disappearing — the citing paper still cited this work.
- **`deleteArticlePdf`** — the first thing `pdf-storage.ts` has ever taken away.
  Idempotent because S3 answers 204 for a key that was never there, which is what
  makes the cleanup retryable at all. It carries the same ownership check the
  reads do, which matters more here: a mixed-up key read is a disclosure, a
  mixed-up key deleted is another user's paper gone.
- **`lit-tracker.pdf-cleanup`** — a queue and a handler. Its job carries
  `{userId, articleId}` and **derives** the key, so a cleanup can only ever name
  an object inside its own user's prefix; a key in the payload could name any
  object in the bucket. No dead-letter queue, unlike the extraction stages, and
  the reasoning is on the retry policy.
- **The confirmation dialog**, on the same three-dot popover as "edit…", below it
  and separated by a real gap as well as by the error colour.

## Browser verification — 2026-09-13, Chrome, local Compose stack

Seeded four things a deletion has to take with it, and one it must not: an
article with notes, an annotation, an applied tag and an incoming citation edge;
a failed extraction with its `upload_jobs` row; and a second paper whose
bibliography pointed at the first. All seeded rows were deleted by id afterwards
and the collection is back to its five.

- **Delete from a collection card.** The confirmation named the whole paper, a
  near-miss (`Delete`) left the control inert and grey, the exact word turned it
  red, and the card left the grid at once with no toast.
- **What went with it, checked in Postgres**: the article, its annotation and its
  tag application gone; the tag itself still there; the citing paper's edge still
  there with `cited_article_id` null and its printed title intact.
- **The PDF really leaves Garage.** A real PDF was uploaded through the app,
  extracted, and deleted from the detail page. The pg-boss job reached
  `completed`, and a probe row planted on the dead key afterwards made the
  serving route answer *"The file could not be read."* — the object is gone, not
  merely unreferenced.
- **Deleting from the detail page** navigated to the collection as the write went
  out. No flash of "no such article in your collection".
- **A failed upload deleted this way cleared the header's warning**: the red
  triangle became the plain resolved check, with nothing else done to it.
- **Keyboard only**: tab to the field, type, Enter submits.
- **Dark theme at 520px**: the dialog fits, the warning wraps, nothing clipped.
- Console carries the pre-existing `data-theme` hydration mismatch and one Zero
  reconnect notice from a Docker restart mid-session. Nothing from this branch.

## What the browser found, and what changed because of it

**"delete…" fell off the bottom of the window.** On the detail page, whose menu
shows the article's whole title, a paper with a long one grew the popover past
the foot of a 1440x900 window — "edit…" sat on the last pixel row and "delete…"
was not on screen at all. The menu had no height limit, because until this task
nothing below the title mattered enough to notice.

The popup is now capped at the positioner's `--available-height`, and the details
region is what gives way: capped at about five lines and scrolled, with the
action rows marked `flex-shrink: 0`. The separator under the details moved out of
`article-details.module.css` and onto the menu's own wrapper in the same change —
inside a scroll region it would only have been visible at the bottom of a long
title.

Worth noting for what it says about the earlier task: this was *already* true of
"edit…" before today, marginally, and task 1's browser pass did not catch it
because the article it was checked against had a shorter title. The layout only
fails on content nobody had seeded yet.

## What the coverage gate found, and what changed because of it

The ratchet caught a real gap rather than a number: the new lines at the mutate
endpoint sat inside an anonymous handler closure, uncovered, along with the
handler that was already there. Rather than test around it, the body was pulled
out as **`runMutation`** — one mutation as this application performs it, the
mutator and then its follow-up.

That is a better shape for the reason the gate existed: the *order* and the
*shared transaction* are the whole design of this task's server half, and
neither is visible from inside a closure passed to a library. Named, they are
two assertions that need no database.

## Structural change: the worker moved

`extraction/worker.ts` held both the retry-until-connected boot loop and
extraction's own queue bindings. The cleanup is not a stage of that pipeline — it
runs once, at the far end of an article's life — so registering it from a file
called `extraction/worker.ts` would have been a name that lied.

The boot loop is now `jobs/worker.ts` (`startJobWorker`), beside the queue
definitions and for the reason `queue.ts` already gives for itself: more than one
part of this feature has jobs, and neither owns the worker. `handleEach` moved to
`jobs/handle-batch.ts` so both registrars can share it without a cycle. Each
pipeline still owns its own wiring.

## Log

- 2026-09-12 — Filed with the feature.
- 2026-09-13 — Researched; the pg-boss premise corrected, the two remaining open
  items decided with the user, implemented.
