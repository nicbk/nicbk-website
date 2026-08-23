# Constraints and Behavior: Selection Across Pages

The last of the feature's **"Scrolling and selecting by touch"**: what
[task 4](../touch-selection/constraints-and-behavior.md) deliberately stops
short of.

## Satisfied here

- **A handle dragged beyond its page extends the selection onto the next one**,
  and back again when dragged the other way.
- **The paper scrolls while a handle is held near the panel's edge**, and stops
  when the finger moves away from it or lets go.
- **A multi-page selection is an ordinary selection**: the copy control offers
  all of it, ⌘C copies all of it, a text-markup tool marks all of it. This is
  already true of a pointer drag and must not become a second code path.

## Must not regress

- **Everything task 4 ships**: the hold, the handles, the magnifier, and
  character-precise extension within a page.
- **Touch scrolling** (task 2) and **pinch** (task 1) — a handle drag scrolls
  the viewport deliberately, and nothing else may start doing so by accident.
- **Pointer selection across pages**, which has worked since #9.

## Constraints particular to this task

- **Which page is under the finger is asked of the library, not the DOM.** The
  scroll capability reports every visible page's position in viewport
  coordinates (`pageVisibilityMetrics`); hit-testing with `elementFromPoint`
  would work until a handle or a magnifier sat under the touch point.
- **Auto-scroll must be proportional and bounded.** A fixed step is either too
  slow to cross a page or too fast to stop on a line; the rate follows the
  distance past the edge, and stops at the document's ends.
- **Auto-scroll must not fight the reader.** It runs only while a handle is
  actually held, and one frame after release the viewport is theirs again.
- **The selection must stay ordered across pages.** A range whose start is on a
  later page than its end is the bug this invites; the library normalizes, and
  the mapping here must agree with it rather than rely on it.
- **Decompose so the decision is testable without a DOM.** Which page a viewport
  point falls in, and what scroll rate an edge distance implies, are both pure
  functions over numbers the library hands out.

## Cross-cutting

- WCAG 2.2 AA: nothing here becomes the only way to do anything — a pointer
  drag already crosses pages, and the sidebar's own list is unaffected.
- Both themes; narrow, mid and wide — narrow most of all.
- No stored data, no schema change, no new mutator.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
