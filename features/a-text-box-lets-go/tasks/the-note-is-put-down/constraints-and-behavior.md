# Constraints and Behavior: The Note Is Put Down

The feature's behavior and constraints, plus:

- **Three files, one responsibility each:**
  - `note-being-edited.ts` reads the engine's DOM;
  - `press-ends-the-edit.ts` is the pure decision;
  - `use-note-editing-ends.ts` holds the lifecycle.
- **The page attribute is this reader's own** (`data-reader-page`), set on the
  page wrapper in `pdf-reader.tsx`, not borrowed from the library.
- **Escape reuses the existing dismiss listener** rather than adding a second
  `keydown` handler. One listener is no ordering.

## Acceptance

The feature's criteria 1–7.
