# Constraints and Behavior: The Note Is Written Beside the Passage

The feature's behavior and constraints, except "Notes make room". In this task
**every** existing annotation, margin notes included, is an obstacle. The note
opens at #24's 72 × 40pt (width capped by the margin) and does not yet grow.

- **`reader/margin-note/`**, one responsibility per file:
  - `margin.ts`: the text block's edges from text runs, and the nearer margin;
  - `placement.ts`: pure; a rectangle or a refusal reason;
  - `create-margin-note.ts`: the highlight, then its reply;
  - `use-empty-note-removal.ts`: deletes a margin note left empty when editing
    ends.
- **The highlight is made through `markSelection`**, the path the menu's four
  markup tools already take. The note is created only once the highlight exists,
  so its `inReplyToId` names a real annotation.
- **The refusal reuses the menu's own status slot**, the one *copy* uses to say
  *copied*, rather than a toast or a second popup.

## Acceptance

The feature's criteria 1–7.
