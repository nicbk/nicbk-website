# Status: The Note Is Put Down

**State:** Implemented, awaiting review ([#242](https://github.com/nicbk/nicbk-website/issues/242); PR [#249](https://github.com/nicbk/nicbk-website/pull/249)).

## What shipped

- `reader/note-editing/note-being-edited.ts`, `press-ends-the-edit.ts`,
  `use-note-editing-ends.ts`, each with its unit tests.
- `pdf-reader.tsx`: the page wrapper says which page it is; the annotation
  layer's key is its page's generation; Escape ends the edit.

## Verified

- **Unit:** 19 tests. Both mutation checks fail as they should: ending at
  pointer-up fails 2, and dropping the blur fails 2. The full suite passes
  (2028), as do typecheck and lint.
- **Chromium, the signed-in stack, a real PDF:** every row of the feature's
  browser table except Safari. After each case, editing was over, the note
  dragged 57px, and its text survived a reload. Pressing delete mid-edit deleted
  the note. No flash on remount: the note was in the DOM in each of 40
  animation frames sampled across the click.
- **Not yet:** Safari on an iPhone (a tap away, and a scroll that keeps the
  keyboard). This is the user's check.

## Log

- 2026-10-11: reproduced and its cause confirmed; spec'd.
- 2026-10-12: implemented and verified in Chromium.
