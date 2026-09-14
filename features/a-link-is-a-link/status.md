# Status: A Link Is a Link

**Feature state:** **In progress** (2026-09-14) — task 1 merged (#190), task 2 implemented, in review.

Spec written against `main` at `917e224`, from a local reproduction and a
measurement of five papers' links with the reader's own engine. See
[research.md](./research.md).

Depends on [`article-detail-and-reader`](../article-detail-and-reader/status.md)
(#9) and [`reader-marking-a-passage`](../reader-marking-a-passage/status.md)
(#15), both Complete.

Feature parent issue: [**#185**](https://github.com/nicbk/nicbk-website/issues/185),
with one sub-issue per task. Roadmap entry **#22**. The parent is **closed by
hand** on completion.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`links-stay-put`](./tasks/links-stay-put/status.md) | **Merged** ([#186](https://github.com/nicbk/nicbk-website/issues/186)) | [#190](https://github.com/nicbk/nicbk-website/pull/190) | green | approved |
| [`where-a-link-points`](./tasks/where-a-link-points/status.md) | Implemented ([#187](https://github.com/nicbk/nicbk-website/issues/187)) | — | — | — |
| [`a-citation-previews-in-place`](./tasks/a-citation-previews-in-place/status.md) | Not started ([#188](https://github.com/nicbk/nicbk-website/issues/188)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, all three tasks
merged behind passing CI + human review, and the browser checks run in Chrome and
Safari.

## Notes carried into implementation

- **Six decisions made with the user** — see research §6. Preview, not jump; a
  crop, not text; snap numbered citations; copy URLs; links only.
- **The link tool shares the highlighter's categories.** Lock by a category of
  its own.
- **Registered renderers replace built-ins by id.** That is how the click is
  owned.
- **Two things are raised, not guessed:** a link inside a mark, and the site's
  first confirmation toast's style.

## Log

- 2026-09-14 — **Task 2 implemented** and run over the real papers: 76/77 and 62/62
  numbered citations preview their own entry. The papers added three rules the
  spec lacked — see the task status.
- 2026-09-14 — **Task 1 merged** (#190). Safari on `nicbk.com`: links locked,
  a citation click does nothing, no menu. The clipboard copy needs a real click
  in Safari, which a script cannot give; left for the user to try.
- 2026-09-14 — **Task 1 implemented.** Links locked, URLs copy. Two browser
  findings: an inherited `pointer-events: none` made links unclickable (fixed),
  and a drag cannot start on a link (accepted with the user). Inside a mark, a
  click on a citation reaches the link — recorded for task 3.
- 2026-09-14 — **Spec'd.** Reproduced locally: clicking `[13]` offered to delete
  it. Measured before design: internal links are not only citations, LaTeX
  targets are exact, publisher targets are off by up to five entries, and every
  numbered citation measured snaps to its own entry.
