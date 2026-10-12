# Plan: A Passage Gets a Margin Note

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`the-note-is-written-beside-the-passage`](./tasks/the-note-is-written-beside-the-passage/description.md) | [#243](https://github.com/nicbk/nicbk-website/issues/243) | *note* on the selection menu: a highlight plus a linked, locked text box in the nearer margin, level with the passage; refused when it would overlap anything; linked deletion |
| 2 | [`notes-make-room-for-each-other`](./tasks/notes-make-room-for-each-other/description.md) | [#244](https://github.com/nicbk/nicbk-website/issues/244) | Margin notes re-arranged within reach of their passages to fit a new one; a note that grows to fit its text; selecting a note or its passage shows both |

## Why this order

Task 1 is usable on its own. Every note lands beside its passage or is refused,
and nothing ever overlaps. Task 2 turns some of those refusals into
re-arrangements, and is pure layout on top of a link that task 1 already stores.

## Approach

- **The link is the PDF's own.** The note is an annotation *in reply to* its
  highlight (`inReplyToId`, the PDF `IRT` entry). EmbedPDF already deletes an
  annotation's replies with it (`research.md` §2), and the sync bridge stores
  every field it does not exclude, so the link persists with no schema change.
- **The lock is the PDF's own.** The `locked` annotation flag makes EmbedPDF
  refuse to move, resize or rotate an annotation while still letting it be
  selected and edited (`isAnnotationStructurallyLocked`). That is exactly the
  decided behaviour, with nothing re-implemented.
- **The margin is measured from the page's own text.** The engine's per-page
  text runs give the text block's left and right edges. The margin is what lies
  between them and the page edge (`research.md` §3).
- **Placement is a pure function**: page geometry, the passage's rectangle and
  the rectangles of every annotation on the page in, a rectangle or a reason out.
  Task 2 widens it to also return moves for other margin notes. Both are
  unit-tested without a reader.

## Risks

- **Narrow margins.** Measured margins run from 54pt (an ACM two-column paper)
  to 108pt (NeurIPS). The #24 note is 72pt wide, so the note's width becomes the
  margin's, capped at 72. Below a 36pt usable width (about nine characters at
  8pt), *note* is refused, with the reason.
- **The engine creates two annotations, and the sync must see both.** The
  highlight has to exist before its reply names it. The task verifies that both
  rows arrive, and that a deletion removes both.
- **A locked box that cannot grow hides text.** That is why growth to fit is
  part of this feature rather than deferred (task 2). Until task 2 lands, the
  note opens at #24's four-line height.

## Dependencies

#9 (reader, annotations, sync), #15 (marking a selection from its menu), #24
(the margin text box's size), #27 (a note lets go of editing).
