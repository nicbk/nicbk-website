# Status: Reader Text Tools

**State:** Not started. Sixth of six — added 2026-08-16, and now the feature's
last task.

- Branch: `article-detail-and-reader/reader-text-tools`, from `main` after
  task 5 merges.
- Sub-issue: [**#105**](https://github.com/nicbk/nicbk-website/issues/105),
  filed 2026-08-16 when the task was.
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, close the feature's parent issue #95 by hand.** GitHub does not
  close a parent when its sub-issues close. This duty moved here from task 5
  when this task became the last.

## Why this task exists

Decided with the user on 2026-08-16, out of using task 4's reader: copy
selected text, text associated with marks (comments), and a translucent
rectangle were asked for together, and folding them into task 4 would have
grown a diff that was already about a new synced table. The capability list is
decided; the UI is not.

## Open items to settle before writing

- **The UI for all three capabilities** — where copy lives, what editing a
  mark's text looks like, and the translucent rectangle's place and name in the
  tool menu. Nothing in `research/` decides any of it yet; settling these means
  revising
  [reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)
  with the decisions, as every prior reader change has.
- **Re-verify EmbedPDF's selection and annotation APIs against the installed
  version** before designing: what the selection scope exposes for copy, how a
  custom tool (the translucent rectangle) is registered, and how `contents`
  edits flow through the annotation plugin. Research over recall.
- **Capture-at-creation mechanics** — whether the selected text is available in
  the annotation create event or must be read from the selection scope at
  tool-apply time.

## Log

- 2026-08-16 — Filed: folder, this spec at the depth decided so far, and
  sub-issue #105 under #95. Written during task 5's branch (docs only), so the
  parent issue visibly counts six sub-issues before task 5 merges.
