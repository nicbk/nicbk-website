# Status: A Passage Gets a Margin Note

**Feature state:** **Spec'd** (2026-10-12). No task started.

Spec written against `main` at `b3ae7a2`, from the engine's own source and
from margins measured on real papers. See [research.md](./research.md).
User decisions taken 2026-10-12:
- **nearer margin**, refused when there is no room, never the far side;
- **a leader line only if it adds clarity without clutter**, so none;
- **deleting the highlight deletes the note**;
- **only margin notes are re-arranged**, and each stays close to its passage;
- **a margin note cannot be moved by hand**.

Feature parent issue: [#240](https://github.com/nicbk/nicbk-website/issues/240), with 2 sub-issues. The roadmap entry is **#28** in
[../index.md](../index.md).

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`the-note-is-written-beside-the-passage`](./tasks/the-note-is-written-beside-the-passage/status.md) | Not started | — | — | — |
| [`notes-make-room-for-each-other`](./tasks/notes-make-room-for-each-other/status.md) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria met, both tasks merged behind CI and review, and a note
written from a phone.

## Decided at spec time, open to revision

These are judgement calls the user did not make explicitly. Each is one constant
or one rule:
- **48pt reach** for a note from its passage.
- **4pt gap** between notes.
- **36pt minimum usable width.**
- **An empty note is removed** when editing ends.
- **A note that has grown past what the margin can fit is shown in full anyway.**

## Log

- 2026-10-12: spec'd, with the user's decisions above.
