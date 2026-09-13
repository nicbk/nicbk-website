# Feature: Article Edit

**#11** in [../index.md](../index.md). The reader gets to correct the record, and
to remove a paper they did not mean to keep.

## What it is

Every article in the collection was written by a machine reading a PDF. GROBID is
good and it is not right: it takes a running header for a title, invents an
author out of an affiliation line, misses a venue entirely. When it fails
outright the article still arrives — **titled with the filename, with no authors
at all** — because #7 decided that a paper the extractor could not read is still
the reader's paper.

Today nothing in the app can change any of that. There is no way to fix a title,
no way to remove an author who is not one, and no way to delete an article at
all. A failed upload leaves a warning icon in the header that **nothing can ever
clear**, because the only two things that clear it — editing the article or
deleting it — do not exist.

## Why it is worth a feature

Because it is the difference between a collection and a list of guesses. Every
other tracker surface reads this metadata: the card's title and authors, the
detail page, the search that matches on them, and the citation graph that will
match references against them. One wrong title is wrong everywhere, forever.

And because the failure path is currently a dead end that the design always
intended to have an exit. `research/ui-ux/pages/lit-tracker/components/upload-status.md`
says a failed row disappears "once the problem is resolved via article-edit
(edited or deleted)" — a sentence describing something that has never been
possible to do.

## What it delivers

- **A modal for an article's details**, opened from the three-dot menu that is
  already on the card and on the detail page, built on the interface decided on
  2026-07-02 in
  [article-edit.md](../../research/ui-ux/pages/lit-tracker/components/article-edit.md).
- **Title, authors, year, venue and DOI, editable by hand.** Title and authors
  required; the rest may be blank. Authors are a list — one row per author —
  because that is what the column holds and what "remove the third author" needs.
- **Delete, behind a typed confirmation**, reusing the exact-text-match pattern
  that already guards account deletion rather than a native `confirm()`.
- **The PDF removed from storage too**, not only the row — a deleted article is
  deleted, including the bytes the user uploaded.
- **A way out of the failure path**: a failed upload's row in the status popup
  opens this modal on the fields that are missing, and resolving it clears the
  warning.

## What it does not do

- **Not reference editing.** The decided interface includes it, and it is
  deliberately deferred to **#10** with the Citations tab that displays
  references and the matching logic that graduates them — settled with the user
  on 2026-09-12. Building a reference editor before any surface shows references
  would build it twice. Recorded in
  [constraints-and-behavior.md](./constraints-and-behavior.md) so the deferral
  does not become an omission.
- **No re-run of extraction.** This is the manual path; asking GROBID again is a
  different feature and not one anybody has asked for.
- **No new notion of who owns what.** Every write goes through the same mutator
  boundary and the same per-row ownership checks as every other write on the
  site.
- **No bulk operations.** One article at a time, from the menu that is already
  about one article.

## Exit state

A reader sees a title that is wrong, opens the menu they already use for tags and
reading status, fixes it, and the correction is on every surface at once. A paper
they uploaded by mistake can be removed — deliberately, with the friction that
deserves — and takes its annotations, its job row and its PDF with it. The
warning icon over a failed upload can finally be answered.
