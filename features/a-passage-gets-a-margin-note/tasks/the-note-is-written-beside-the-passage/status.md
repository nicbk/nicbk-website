# Status: The Note Is Written Beside the Passage

**State:** Complete, merged in [#250](https://github.com/nicbk/nicbk-website/pull/250) ([#243](https://github.com/nicbk/nicbk-website/issues/243); PR [#250](https://github.com/nicbk/nicbk-website/pull/250)).

## What shipped

- **`reader/margin-note/`**, one responsibility per file:
  - `margin.ts`: the text block from the page's own text runs, and the nearer
    margin;
  - `placement.ts`: pure; a rectangle or a refusal;
  - `margin-note.ts`: what a margin note is (a `freeText` with `inReplyToId`
    and the `locked` flag) and how one is recognised;
  - `create-margin-note.ts`: creating it already open for typing;
  - `use-margin-note.ts`: the action, deciding before making anything;
  - `use-empty-note-removal.ts`: a note left empty goes when its editing ends.
- **`selection-menu.tsx`**: the *margin note* glyph, and its refusal words.
- **`mark-selection.ts`**: an `onMarked` callback, so the note can name the
  highlight it answers. This is the same path the menu's highlight takes.
- **`pdf-reader.tsx`**: the engine is handed to the document, for its text runs.

## Decided at implementation (2026-10-12)

- **"margin note", not "note".** The mark menu already offers "write a note",
  which is a comment kept on the mark and listed in the sidebar. Two controls
  both called "note" for two different things would be a guess every time.
- **A glyph, not a word.** Measured, the selection bar was already full at its
  21rem cap. With "margin note" spelled out, *copy* clipped to 31 of its 34px and
  the new word to 88 of 92. As a glyph like the four marks, the bar rests at
  249px. A refusal shows a short word ("no room", "too narrow"), with the
  sentence in its name and title. "too narrow" took the bar to 337px, one pixel
  past the cap, so the cap is now 22rem; the measurement is in the stylesheet.
- **Opening the note for typing uses the plugin's own `createAnnotation`.** The
  public scope method has no way to say "open for typing". That option exists
  only on the plugin's method, as a fifth argument, which the engine's own tools
  pass. Its shape is checked before the call and pinned by a test against the
  installed package. If an upgrade changes it, the note is still made, closed
  rather than open.
- **The refusal comes before anything is made.** The margin is measured and the
  page's annotations consulted first, so a refusal never leaves a highlight
  whose note could not be placed.

## Verified

- **Unit:** 30 tests across the margin-note modules, plus 4 more on the
  selection menu. The four mutation checks fail as they should: dropping
  `locked` fails 3 tests, dropping `inReplyToId` 3, the far margin 8, and
  ignoring obstacles 2. The full suite, typecheck and lint pass.
- **Chromium, against the signed-in stack.** Measured in page points from the
  rendered rectangles:

  | case | result |
  |---|---|
  | TraceMonkey (ACM, 54/56pt margins), left column | note at x 4, 46 × 40pt, top 102pt beside a passage at 103pt; opens for typing |
  | the same paper, right column | right margin, x 560, 48pt wide |
  | single column, 108pt margin | the full 72pt note at x 32, against the text |
  | click away | editing ends (#27) |
  | drag the note | moves 0px; it is locked |
  | double-click it | edits |
  | the next line, same spot | refused, *no room*, and the selection is kept |
  | *margin note*, then away with nothing typed | the note goes; the highlight stays |
  | delete the highlight | its note goes, and stays gone after a reload; the other note stays |
  | 375px, dark theme | the bar fits on screen (x 49→298); the note lands in the margin |
  | the bar, at rest / *no room* / *too narrow* | 249 / 312 / 337px; nothing clipped |

- **Not verified:**
  - Safari, and a touch-made selection (the user's phone check).
  - A real paper with a margin under 44pt: none was at hand, so *too narrow*
    is covered by the unit tier and by measuring the bar with the word in
    place.

## Log

- 2026-10-12: spec'd.
- 2026-10-12: implemented and verified in Chromium.
- 2026-10-12: #250 merged.
