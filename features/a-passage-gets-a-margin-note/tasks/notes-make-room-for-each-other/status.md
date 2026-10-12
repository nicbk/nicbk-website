# Status: Notes Make Room for Each Other

**State:** Complete, merged in [#251](https://github.com/nicbk/nicbk-website/pull/251) ([#244](https://github.com/nicbk/nicbk-website/issues/244); PR [#251](https://github.com/nicbk/nicbk-website/pull/251)).

## What shipped

- **`margin-note/packing.ts`**: an exact search over whole-point positions (at
  most 97 a note) for the arrangement of a margin's notes that moves least. It
  keeps order, 4pt gaps, the 48pt reach and the page, and answers null when
  nothing fits.
- **`placement.ts`** now packs the column. The new note joins the existing
  margin notes there, and the answer carries their moves. `packColumn` is the
  same packing for a note that changed height.
- **`page-contents.ts`**: the page as placement sees it, margin notes (movable,
  anchored to their highlight's top) and everything else (fixed), plus the
  batch of rectangle patches that applies a packing.
- **`note-height.ts` and `use-note-fits-its-text.ts`**: a note is sized to its
  text when editing ends, and its margin re-packed.
- **`linked-partners.ts` and `linked-partner-outline.tsx`**: the dashed outline
  on a selected note's passage, or a selected highlight's note.
- **`pdf-reader.module.css`**: a text box being written shows everything typed
  into it, past its box.

## Decided at implementation (2026-10-12)

- **Notes shrink as well as grow.** "Fits its text" applies both ways, so a
  one-word note takes one line of margin. The browser showed what this buys:
  seven notes on seven consecutive lines all fit, where at #24's fixed 40pt only
  three did.
- **A tie goes downward.** When two arrangements move notes equally far, the one
  pushing notes down the page wins (a 0.001-per-point nudge). A note lifted above
  its passage reads as belonging to the line above. Found by the unit tier: a
  note that grew was as likely to rise off its own passage as to push its
  neighbour down.
- **The height is measured where the engine saves.** The editor carries no id,
  so it is measured in a capture-phase `focusout` listener. That runs, by the
  DOM's event model, before React's `onBlur`, which saves the text. The
  measurement is matched to the save that follows in the same task.
- **…and kept for a task, not a microtask.** The first version cleared the
  measurement in a microtask. In the browser it was gone before the save
  arrived, because microtasks drain between one event listener and the next. A
  unit test now holds the measurement across that gap.
- **Text overflows while typing.** The engine clips its editor to the box. A
  margin note cannot be resized by hand, so without this the reader would type
  blind past the fourth line. The rule applies to every text box while it is
  being written; at rest the box is the box.

## Verified

- **Unit:** 83 tests across `margin-note/`. The three mutation checks fail as
  they should: a 49pt reach fails 1 test (the reach is pinned as a number), moving
  non-note annotations fails 6, and applying moves when nothing fits fails 1.
  The full suite (2114), typecheck and lint pass. Line coverage is 95.03%.
- **Chromium, against the signed-in stack**, on TraceMonkey's left column (54pt
  margin), measured in page points:

  | case | result |
  |---|---|
  | seven margin notes on seven consecutive lines | all placed, in order, 4pt apart, each within 48pt of its passage (asserted) |
  | write five lines into the first | it grows to 66pt; the margin re-packs with no overlap (asserted), the first note rising to the edge of its reach |
  | select a note | its passage gets the dashed outline |
  | select a highlight | its note gets the outline |
  | reload | every note where it was |

- **Not verified:** Safari, and touch (the user's phone check).

## Log

- 2026-10-12: spec'd.
- 2026-10-12: implemented and verified in Chromium.
