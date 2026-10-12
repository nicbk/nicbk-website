# Status: A Paper Shows Its Contents

**Feature state:** **In progress** (2026-10-12). Tasks 1 and 2 merged; task 3 implemented, awaiting review.

Spec written against `main` at `b3ae7a2`, from:
- outlines read with the installed engine;
- headings from a real GROBID 0.9.1 run;
- the sidebar measured in Chromium at three widths.

See [research.md](./research.md). User decisions taken 2026-10-12:
- **one feature** for the outline and its automatic discovery;
- **a fifth sidebar tab**, with the sidebar kept clean and navigable,
  re-arranged where needed;
- **a toolbar button** that opens it;
- **a job** that finds the contents of papers already in the collection.

Feature parent issue: [#241](https://github.com/nicbk/nicbk-website/issues/241), with 4 sub-issues. The roadmap entry is **#29** in
[../index.md](../index.md).

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`the-contents-are-read`](./tasks/the-contents-are-read/status.md) | Merged | [#252](https://github.com/nicbk/nicbk-website/pull/252) | Green | Merged by user |
| [`older-papers-are-read-for-contents`](./tasks/older-papers-are-read-for-contents/status.md) | Merged | [#253](https://github.com/nicbk/nicbk-website/pull/253) | Green | Merged by user |
| [`the-contents-tab`](./tasks/the-contents-tab/status.md) | Implemented | — | — | Awaiting |
| [`the-toolbar-opens-the-contents`](./tasks/the-toolbar-opens-the-contents/status.md) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria met, all four tasks merged behind CI and review, and the
contents used on a phone.

## Decided at spec time, open to revision

- **Numbered GROBID heads only.**
- **The two-entry minimum** for an embedded outline.
- **The tab's position**, between *citations* and *annotations*.
- **The "in view" rule**: the panel's top third. *Revised in task 3* to the
  line a jump lands on (see `constraints-and-behavior.md`).
- **Font heuristics deferred.**

## Log

- 2026-10-12: task 3 implemented. The "in view" rule revised to the jump's
  landing line; page numbers dropped from the rail's list.
- 2026-10-12: task 2 merged ([#253](https://github.com/nicbk/nicbk-website/pull/253)).
- 2026-10-12: task 2 implemented. Reading the outline of a generated 61 MB,
  1,000-page book peaks at +212 MB RSS and does not grow with repeated reads.
- 2026-10-12: task 1 merged ([#252](https://github.com/nicbk/nicbk-website/pull/252)).
- 2026-10-12: task 1 implemented; the engine's WebAssembly is shipped to the
  production server as a Nitro server asset, found missing by building for
  production.
- 2026-10-12: spec'd, with the user's decisions above.
