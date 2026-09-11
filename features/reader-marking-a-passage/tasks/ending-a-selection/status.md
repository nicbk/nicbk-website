# Status: Ending a Selection

**State:** Not started. First of two.

- Branch: `reader-marking-a-passage/ending-a-selection`, from `main` at
  `a8dbd4e` or later.
- Sub-issue: [**#129**](https://github.com/nicbk/nicbk-website/issues/129).
- PR: opened once the unit tier and the browser pass are both clean.
- The close-#15-by-hand duty belongs to
  [`marking-from-the-selection`](../marking-from-the-selection/status.md), the
  last task to merge.

## Why this task exists

Measured on 2026-09-11, after #12's task 5 asserted behaviour that turned out
not to exist. The library never emits its end-of-selection event for a drag
released over another page, nor for a selection applied through the public API;
everything downstream waits on that event and silently does nothing. See the
feature's [research.md](../../research.md) for the two code paths.

## Open items to settle before writing

- **Where the "a selection finished" decision is fed from.** `touch-selection/`
  already watches pointers at the window on the capture phase, for the drag that
  crosses pages; whether this rides that or sits beside it is a question about
  ordering, and `AGENTS.md`'s rule says the answer must be chosen rather than
  inherited.
- **Whether the re-apply can be avoided entirely** for the touch path. A touch
  selection is applied by this reader, so the reader knows it is finished
  without asking — the re-apply may be needed only for the mouse's stuck flag.
  One path or two is a design question to settle while writing, and the smaller
  answer wins if both work.

## Log

- 2026-09-11 — Filed with the feature.
