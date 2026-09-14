# Status: A Link Is a Link

**Feature state:** **Spec'd** (2026-09-14) — 3 tasks, not started.

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
| [`links-stay-put`](./tasks/links-stay-put/status.md) | Not started ([#186](https://github.com/nicbk/nicbk-website/issues/186)) | — | — | — |
| [`where-a-link-points`](./tasks/where-a-link-points/status.md) | Not started ([#187](https://github.com/nicbk/nicbk-website/issues/187)) | — | — | — |
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

- 2026-09-14 — **Spec'd.** Reproduced locally: clicking `[13]` offered to delete
  it. Measured before design: internal links are not only citations, LaTeX
  targets are exact, publisher targets are off by up to five entries, and every
  numbered citation measured snaps to its own entry.
