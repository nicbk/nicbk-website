# Constraints and Behavior: A Passage Gets a Margin Note

## Behavior

- **The selection menu offers *margin note*** beside the four markup tools: a
  glyph like them, named and titled "margin note". It is offered when, and only
  when, they are (`canMark`).
- **Pressing it, when there is room:**
  - the passage is highlighted with the highlight tool's own defaults;
  - a text box is created as a reply to that highlight and flagged `locked`;
  - the box sits in the nearer margin with its top level with the passage's
    first line, and opens for typing;
  - the selection is cleared.
- **Pressing it, when there is no room:** nothing is created and the selection
  stays. The button itself says why, in a short word beside its glyph, the way
  *copy* reports *copied*. Its accessible name and title carry the whole
  sentence:
  - *no room* ("no room in the margin beside this passage") when the spot is
    taken;
  - *too narrow* ("the margin here is too narrow for a note") when the usable
    width is under 36pt.
- **The nearer margin** is the left one if the passage's horizontal centre is
  left of the text block's centre, and the right one otherwise.
- **The note's width** is the margin's width less a 4pt inset at each side,
  capped at #24's 72pt. Its text is #24's 8pt.
- **"Room"** means the note's rectangle intersects no annotation on the page:
  marks, text boxes, sticky notes and links. Before task 2, other margin notes
  count as obstacles like anything else. After task 2, margin notes may move
  (see "Notes make room").
- **A margin note cannot be moved, resized or rotated by hand.** It can be
  selected, edited by double-click, and deleted.
- **Deleting the highlight deletes its note.** Deleting the note leaves the
  highlight.
- **A note left empty when editing ends is deleted**; its highlight stays. An
  empty box in the margin is clutter with no content.

### Notes make room (task 2)

- **A margin note may move only within 48pt of its passage** (about four lines
  of body text). It moves vertically and never leaves its page or its margin.
  That includes the note being made: within its reach it steps round anything
  fixed in its way, rather than being refused because its exact spot is taken.
- **Only margin notes move.** Every other annotation is fixed.
- **Notes keep their order down the page**, and sit at least 4pt apart.
- **Notes move only when they must:** to make room for a new note, or for one
  that grew. A deletion moves nothing back. A layout that shifts by itself is
  motion nobody asked for.
- **If no arrangement satisfies all of the above,** the new note is refused and
  nothing moves.
- **A note's height fits its text** when editing ends, with one line as the
  minimum, so a short note takes one line of margin, not four. Growth that
  cannot be fitted is still shown in full, because the reader's words are never
  hidden; its neighbours then stay where they are.
- **While a note is being written, everything typed shows**, even past its box,
  because the box cannot be resized by hand.
- **Selecting a margin note outlines its passage, and vice versa**: a dashed
  outline in the accent colour, distinct from the engine's solid selection
  box.

## Constraints

- **No new annotation type, no schema change.** The link is `inReplyToId` and
  the lock is the `locked` flag, both stored in the existing `payload`.
- **No second tool.** *margin note* is an action on the selection menu, built from the
  highlight tool and the `freeText` tool that #24 sized. The tool menu is
  unchanged.
- **One placement module**, pure and unit-tested, owning the margin geometry and
  the packing. The reader calls it; it does not reach into the reader.
- **The measurement comes from the engine** (`getPageTextRuns`), not from
  GROBID. It has to work on any page, of any paper, offline.

## Acceptance criteria

1. On a single-column paper, *margin note* on a sentence in the body puts a box in the
   nearer margin, level with the sentence, ready to type. Typing appears there.
2. On a two-column paper, a passage in the left column writes left and one in
   the right column writes right.
3. With an annotation already where the note would go, *margin note* creates
   nothing and says *no room*. The selection is still there.
4. On a margin under 44pt (36pt usable), *margin note* says *too narrow*.
5. A margin note cannot be dragged or resized. It can be edited and deleted.
6. Deleting the highlight removes the note, on screen and, after a reload, in
   storage.
7. A note left empty is removed when editing ends; its highlight remains.
8. (task 2) Two passages a line apart can each take a note: the second pushes
   the first no further than 48pt from its passage. A third that cannot fit
   within reach is refused, and nothing moves.
9. (task 2) Writing five lines into a note grows it to show all five, and any
   note below it moves down to make room.
10. (task 2) Selecting a note shows its passage selected, and vice versa.
