# Status: Resolving a Failed Upload

**State:** Not started. Task 3 of 3 — last because it points at task 1's modal
and relies on task 2's cascade for its other route.

- Branch: `article-edit/resolving-a-failed-upload`, from `main` with tasks 1 and
  2 merged.
- Sub-issue: [**#143**](https://github.com/nicbk/nicbk-website/issues/143).
- PR: opened once the unit and integration tiers and the browser pass are clean.
- **On merge this completes #11** — check parent issue
  [#140](https://github.com/nicbk/nicbk-website/issues/140) and close it by hand
  if it has not closed itself (2026-09-12 addendum in
  [issue-and-pr-lifecycle.md](../../../../research/project-management-conventions/issue-and-pr-lifecycle.md)).

## Why this task exists

`upload-status.md` has said since 2026-07-02 that a failed row disappears "once
the problem is resolved via article-edit (edited or deleted)" — describing
something that has never been possible. The row stays because it is the only
thing telling the reader the upload needs them, which means today it stays
forever.

## Open items to settle while writing

- **Which field is "missing" enough to focus.** A failed article has a filename
  for a title *and* no authors, so both are wrong and only one can have focus.
  The title is the assumption — it is what the reader recognises the paper by —
  but the failure reason on the row may be the better signal, and it is right
  there.
- **Where focus goes when the row disappears.** Resolving the problem removes the
  thing that was focused, and the popup behind may close with it. This is the
  accessibility question this task actually has to answer.
- **Whether the popup should close when the modal opens.** Two stacked overlays
  read as two live surfaces at once, which `ArticleMenu`'s `modal` prop already
  records a judgement about. Closing it is the assumption; whether it then
  reopens is not, and probably should not.

## Log

- 2026-09-12 — Filed with the feature.
