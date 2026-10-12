# Status: A Paper Shows Its Contents

**Feature state:** **In progress** (2026-10-12). Task 1 implemented, awaiting review.

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
| [`the-contents-are-read`](./tasks/the-contents-are-read/status.md) | Implemented | [#252](https://github.com/nicbk/nicbk-website/pull/252) | Running | Awaiting |
| [`older-papers-are-read-for-contents`](./tasks/older-papers-are-read-for-contents/status.md) | Not started | — | — | — |
| [`the-contents-tab`](./tasks/the-contents-tab/status.md) | Not started | — | — | — |
| [`the-toolbar-opens-the-contents`](./tasks/the-toolbar-opens-the-contents/status.md) | Not started | — | — | — |

## Definition of Done (feature)

All acceptance criteria met, all four tasks merged behind CI and review, and the
contents used on a phone.

## Decided at spec time, open to revision

- **Numbered GROBID heads only.**
- **The two-entry minimum** for an embedded outline.
- **The tab's position**, between *citations* and *annotations*.
- **The "in view" rule**: the panel's top third.
- **Font heuristics deferred.**

## Log

- 2026-10-12: task 1 implemented; the engine's WebAssembly is shipped to the
  production server as a Nitro server asset, found missing by building for
  production.
- 2026-10-12: spec'd, with the user's decisions above.
