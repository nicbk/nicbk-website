# Constraints and Behavior: A Text Box Lets Go

## Behavior

- **A press that begins outside the note being written ends its editing**, once
  that press is over. This holds wherever the press lands: the paper, another
  page, between pages, the sidebar, the toolbar.
- **A finger's press ends it only if it was a tap.** A finger that travelled
  past the long-press tolerance (`touch-selection/hold.ts`) was a scroll, and so
  was a press the browser cancelled.
- **Escape ends it**, alongside what Escape already drops.
- **A press inside the note** (placing the caret, selecting a word) does not end
  it.
- **The text is saved.** The editor is blurred before the layer is replaced,
  because the engine saves on blur and at no other time.
- **The press does its own job first.** Ending the edit waits until the press's
  click has been dispatched, so a press on the note's delete control deletes it.

## Constraints

- **Nothing is withheld from the library.** The listener only reads pointer
  events, in the capture phase on the window. It never stops one, so it takes
  part in no handler ordering (`AGENTS.md`: intercepting a dependency's input
  makes you its bookkeeper).
- **The engine's private state is read only from what it draws**, and only
  inside the reader's own pages: `[data-reader-page] [contenteditable="true"]`.
- **The reset is a React key**, not a patch to the library and not a synthetic
  event.

## Acceptance criteria

1. Write a note, click the bare paper on the same page, then drag the note: it
   moves.
2. The same with a click on another page, and with a click on the sidebar.
3. The same after pressing Escape.
4. After each of the above, a reload shows the text as typed.
5. Pressing the note's delete control while typing deletes the note.
6. On a touch device, a tap away ends the edit and a scroll does not.
7. With the text box tool still live, the click that puts the note down does not
   create a second box.
