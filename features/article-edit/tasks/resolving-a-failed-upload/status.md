# Status: Resolving a Failed Upload

**State:** **Merged** 2026-09-13. Task 3 of 3 — last because it points at
task 1's modal and relies on task 2's cascade for its other route.

- Branch: `article-edit/resolving-a-failed-upload`, from `main` at `006796a`
  with tasks 1 and 2 merged.
- Sub-issue: [**#143**](https://github.com/nicbk/nicbk-website/issues/143).
- PR: [**#147**](https://github.com/nicbk/nicbk-website/pull/147).
- **This completed #11.** Parent issue
  [#140](https://github.com/nicbk/nicbk-website/issues/140) did not close itself
  and was closed by hand — another data point for that document's 2026-09-12
  addendum, which says the auto-close happens only *sometimes*.

## Why this task exists

`upload-status.md` has said since 2026-07-02 that a failed row disappears "once
the problem is resolved via article-edit (edited or deleted)" — describing
something that has never been possible. The row stays because it is the only
thing telling the reader the upload needs them, which means until today it
stayed forever.

## Open items, settled

Two of the three turned out to be **already answered by code that shipped in the
earlier tasks**, which is worth recording: the answer was to find the decision
rather than to make it again.

### Which field to focus: the title, and task 1 already does it

`ArticleEditDialog` focuses the title and collapses the caret to position 0, and
its comment names this exact case — for a failed extraction the title is the
field holding a filename. The title is therefore simultaneously the first field
and the missing one, so `testing.md`'s "focused on a missing field rather than
on the first field regardless" cannot produce a divergence here. **Inventing a
second focus rule to satisfy the wording would have been a mechanism with no
case behind it.** The browser pass confirms what the reader lands on: the title,
showing its beginning, holding `unreadable-paper.pdf`.

The same is true of the author list, for a different reason: `draftFrom` already
opens a failed article on one empty author row rather than on nothing, because
"always at least one row" was decided in task 1.

### Whether the popup closes: yes, through Base UI's own control

The failed row's control is a `Popover.Close`, so the popup closes on the way
into the modal and does not reopen. This is the shape `ArticleMenu` already uses
for "edit…", including the part that is easy to get wrong: **the dialog is
mounted as the popover's sibling, not its child**, because a child would inherit
the popover's lifetime and unmount the form the instant it opened.

It does not reopen afterwards. The reader came to fix one thing; being returned
to a list they have just shortened is not where they were going.

### Where focus goes: the checkmark, made programmatically focusable

The third open item was real, and **sharper than the spec realised**. Resolving
the last failure does not merely shorten the list — it swaps the control.
`UploadStatus` renders a `Popover.Trigger` button while there is something to
show and a `<span role="img">` when there is not, deliberately outside the tab
order. So the element the modal was opened from is *destroyed by the act of
succeeding*, and a `finalFocus` pointing at it drops focus to `<body>` at the
moment a screen-reader user most needs to be told what happened.

Task 2 never met this: deleting removes the card, or navigates the detail page
away, so something else was always taking focus anyway.

`tabIndex={-1}` on the checkmark is what fixes it, and it takes nothing back —
a negative index still keeps the element out of the tab order; what it adds is
the ability to receive focus when something *puts* it there. Focus lands in the
same slot the reader pressed, and announces "All articles synced": the outcome
of what they just did, rather than an unrelated survivor like the "+" button.
(User-decided 2026-09-13.)

One ref spans both branches so the target follows the swap. The article id is
**kept** after the dialog closes rather than cleared, because clearing it would
unmount the dialog in the same commit that closes it — which is what would make
focus restoration a race. The cost is one query for a row the client has already
synced.

## What shipped

- **`retireResolvedUpload`**, inside `articles.updateDetails` — the whole server
  half. The job row is not a second fact that goes stale; it *is* the claim
  "this upload needs you", and saving the metadata is what makes that claim
  false. In the same transaction the two cannot disagree; as a second round trip
  a dropped network would leave a corrected article still flagged as broken.
- **Only a failed job retires.** The lookup filters on `status`, so an article
  edited while extraction is still `processing` keeps its row. Impatience is not
  resolution.
- **`extraction_status` is untouched**, and the code says why rather than
  leaving it looking forgotten: the column records what extraction *achieved*,
  which a later human correction does not revise.
- **The job is addressed through `articleId`**, not through the ids being equal.
  They are — `upload_jobs.id` is the pre-allocated article id — but the foreign
  key is what states the relationship, and a lookup silently depending on an
  equality documented in another file is one schema change from deleting the
  wrong row.
- **`fix…` on the failed row**, named `fix <filename>` for assistive tech so
  twenty failures are not twenty identical buttons. Lowercase, so the visible
  label is contained in the accessible name (WCAG 2.5.3).
- **`FixUploadDialog`** — the signpost. It fetches the article and the mutation
  beside the popup rather than threading them down from `CollectionPage`,
  following the precedent `CollectionToolbar` records for its own jobs query.
  Nothing above it needs to know the popup can open a modal.

## What research found, and what it changed

**A failed job always has an article behind it.** The nullable `articleId`
suggested a dead end this task could not close — a failure with nothing to fix
and nothing to delete. Reading `recordOutcome` settled it: *every* path,
failures included, inserts the article and sets `articleId` in the same
transaction. The null branch in `FailedJob` is therefore unreachable rather than
expected, and it degrades to the row as it looked before this feature, because a
control that cannot open anything is worse than no control. The browser pass
confirmed it against a real GROBID failure: `article_id` was populated.

## Browser verification — 2026-09-13, Chrome, local Compose stack

Both failures were **genuine pipeline failures**, as `testing.md` requires: a
file with a valid `%PDF-` signature and nothing else behind it, so upload
validation accepted it and GROBID could not read it. Both produced
`status = 'failed'`, `failure_reason = "couldn't read this PDF"`, and a
populated `article_id`.

- **The warning appeared**, and the popup listed the row with its filename in
  the error colour and its reason underneath.
- **`fix…` opened the modal on the missing fields**: the title focused showing
  its beginning and holding `unreadable-paper.pdf`, one empty author row below
  it. The popup closed on the way in — one live surface, not two.
- **Saving real metadata cleared the row.** Checked in Postgres: no
  `upload_jobs` row, `extraction_status` still `'failed'`, and the corrected
  title, author and year on the article. The header returned to its checkmark.
- **Focus landed on the checkmark**, asserted rather than eyeballed:
  `activeElement` was the `<span role="img">` named "All articles synced" with
  `tabindex="-1"`, and explicitly not `document.body`.
- **The other route**: a second failed upload, deleted from its card menu
  instead, cleared the same way — card gone, warning gone, cleanup job
  `completed`, no second mechanism involved.
- **Dark theme at 560px**, with the fix control focused: the popup's horizontal
  overflow is 0, the control is an honest 60×44 box, and it has 17px of inset
  against the 4px a focus ring needs. The #142 fault pattern — a touch target
  that overflows a scroll container — is not repeated here.
- Console carries only the pre-existing `data-theme` hydration mismatch. One
  Zero reconnect notice appeared after the tab sat backgrounded past its 60s
  timeout, which is the known behaviour and not this branch.
- Test data removed **through the UI, by id**, so the PDF-cleanup jobs ran
  rather than leaving orphaned objects. The collection is back to the user's own
  rows.

## Log

- 2026-09-12 — Filed with the feature.
- 2026-09-13 — Researched; two of three open items found already answered by
  tasks 1 and 2, the third decided with the user; implemented, unit +
  integration + browser verified, PR opened.
