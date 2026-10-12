# Constraints and Behavior: Notes Make Room for Each Other

The feature's "Notes make room" behavior, plus:

- **Packing is a pure function in `reader/margin-note/packing.ts`.**
  - In: the margin column, the fixed obstacles, and the movable notes, each with
    its passage's top and its height.
  - Out: a top for every note, or a refusal.
  - It minimises total movement, keeps order, keeps a 4pt gap, and never moves a
    note more than 48pt from its passage.
- **Moves are applied as one batch** of `updateAnnotation` rect patches, so the
  sync writes them together and a reload never shows a half-moved margin.
- **The note's height is measured from the engine's own editor** as editing
  ends: the rendered text's height in page points, at the note's width. It is
  not estimated from a character count.
- **Shared selection is drawn by this reader**, as an outline on the linked
  partner. `replyType: Group` is not used (`../../research.md` §1).

## Acceptance

The feature's criteria 8–10, and 1–7 still hold.
