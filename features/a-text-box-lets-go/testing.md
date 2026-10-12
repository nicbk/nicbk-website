# Testing: A Text Box Lets Go

## Unit

- `note-being-edited.ts`:
  - finds the editor and its page;
  - ignores an editable element outside the reader's pages;
  - matches page indices exactly (page 1 does not answer for page 11).
- `press-ends-the-edit.ts`:
  - a mouse or pen press ends the edit, whether it travelled or not;
  - a finger ends it only when it did not wander.
- `use-note-editing-ends.ts`:
  - a press elsewhere moves on only the note's page's generation;
  - the editor is blurred first;
  - the end waits for the press to be over;
  - a press inside the note, a cancelled press and a travelled finger change
    nothing;
  - an edit already over by the time it would end changes nothing;
  - `endNoteEditing` (Escape) ends it at once;
  - the listeners go when the reader does.

Mutation checks, each of which must fail a test: ending at pointer-up instead of
after it; not blurring the editor.

## Browser

The signed-in stack, with a real PDF uploaded, driven by Playwright:

| Check | Engine |
|---|---|
| click the paper → editing over, note drags, text survives a reload | Chromium |
| click another page → the same | Chromium |
| click the sidebar → the same | Chromium |
| Escape → the same | Chromium |
| delete control while typing → the note is gone | Chromium |
| touch tap away → editing over, text survives a reload | Chromium, touch emulation |
| tap away on a phone; a scroll keeps the keyboard | Safari, iOS (user check) |

The last row is the user's. The press-to-blur behaviour of a tap on a surface
that cannot take focus is engine-specific, and is the case the explicit blur
exists for.
