# Plan: A Text Box Lets Go

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`the-note-is-put-down`](./tasks/the-note-is-put-down/description.md) | TBD | A press outside the note, or Escape, ends its editing; each page's annotation layer is keyed by a generation that ending an edit moves on |

## Why one task

One defect, one mechanism, one module (`reader/note-editing/`), and one line in
the reader to key the layer.

## The approach, and the one rejected

**Rejected: hand presses on the bare paper back to the page element.** That is
the engine's own trigger (`research.md` §2), and making the paper image
transparent to pointers would meet it. It was rejected for three reasons.

1. The engine's handler does more than end the edit. It also **deselects on a
   finger's press**, which this reader deliberately overrode so that a scroll
   leaves a mark selected (`click-away.ts`).
2. It would add a new ordering between this reader's click-away guard and a
   library handler that re-registers on every change. `AGENTS.md`'s "An order
   you did not choose…" applies.
3. It would still miss every press off the page, because the engine's rule is
   per page.

**Chosen: watch for the press, then remount the layer.** One read-only window
listener notices a press that begins outside the note being edited. When that
press is over, the hook blurs the editor so the engine saves the text, then
increments the page's generation. The annotation layer is keyed by that
generation, and React remounts it, which is React's own way to reset private
component state. The layer re-reads everything else from the plugin as it
mounts.

## Risks

- **A remount could flash.** Measured in the browser: the note's text was in
  the DOM in each of 40 animation frames sampled across the click that ended
  the edit. The layer re-reads the marks from the plugin synchronously as it
  mounts.
- **Reading the engine's DOM.** `contenteditable="true"` is the outward sign of
  its private state. If a later version stops drawing it, notes would simply
  stop being put down, which is the defect returning rather than a new one. The
  unit tests pin the selector, and the browser check is the guard.

## Dependencies

#9 (the reader), #24 (the margin text box this mostly affects).
