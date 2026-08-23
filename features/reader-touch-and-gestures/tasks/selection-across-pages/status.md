# Status: Selection Across Pages

**State:** **In review** — implemented, browser-verified, and
[PR #126](https://github.com/nicbk/nicbk-website/pull/126) is open with CI
green. Fifth of seven by filing order, and **last to merge** — tasks 6 and 7
were filed after it and run before it, being repairs rather than additions.

- Branch: `reader-touch-and-gestures/selection-across-pages`, from `main` at
  `315073b` — it was task 4 when this was filed, and tasks 6 and 7 were placed
  ahead of it.
- Sub-issue: [**#116**](https://github.com/nicbk/nicbk-website/issues/116).
- PR: [**#126**](https://github.com/nicbk/nicbk-website/pull/126), CI green.
- **On merge, close this feature's parent issue #108 by hand** — GitHub does not
  close a parent when its sub-issues close, and this is still the last task to
  merge.
  (This duty moved here from task 4 when this task was split out of it, having
  moved to task 4 from task 3 for the same reason.)

## Why this task exists

Not because the work was unbuildable — this is the ordinary kind of split. Task
4 answered its three open design questions toward what a phone already does:
iOS-shaped handles, character-precise extension, and a magnifier to aim with.
Each is small; together with a cross-page drag and the auto-scroll it needs, they
made one PR of four subsystems.

Split with the user on 2026-08-23, and split at this seam on purpose: precision
and the magnifier that makes precision usable ship together, so the state
between the two PRs is a finished thing that simply stops at a page edge, not a
half-built one.

## What the reading found, before anything was designed

Verified against the installed EmbedPDF 2.15.0 and this reader's own task-4 code.

- **A handle cannot survive the break it is dragged across, and this is the
  finding that shapes the task.** `selection-handles.tsx` draws each grip inside
  the page that owns its end of the range and captures the pointer *on that
  element*. The moment the dragged boundary lands on the next page,
  `handleAnchors` answers `null` for the old one, the grip unmounts, and its
  cleanup calls `letGo()` — deliberately, because a page scrolled out of the
  virtualized window must not leave a caller believing a finger is still down.
  So the gesture ends exactly where this task needs it to continue. **The drag
  has to be owned above the page.**
- **The arithmetic already crosses pages.** `extendSelection`'s `isBefore`
  compares page before glyph index, and says in its own comment that it does so
  for this task. Nothing in the selection maths changes.
- **The library answers "which page is under the finger" in numbers.**
  `scroll.getMetrics().pageVisibilityMetrics` gives, per visible page, the
  *intersection*'s top-left in viewport coordinates (`viewportX/viewportY`) plus
  that corner's offset inside the page (`scaled.pageX/pageY`) and the scale it
  was measured at — so a page's origin is a subtraction and the whole hit test is
  arithmetic. **`pageNumber` is 1-based** (`page.index + 1`), unlike every page
  index in this reader.
- **Pages are rendered two ahead** (the scroll plugin's `bufferSize` defaults to
  2), and the selection plugin loads a page's geometry when that page registers,
  caching fifty. So a page reached by a dragging finger is normally already
  mounted with its geometry either loaded or in flight.
- **`viewport.scrollTo({x, y})` and `getMetrics()`** are what the auto-scroll
  drives and bounds itself with.

## Open items, as settled

All three settled with the user on 2026-08-23, before any code.

- **The auto-scroll's rate curve: an eased ramp from a dead band.** Nothing
  happens until the finger is within `AUTO_SCROLL_BAND` (56px) of the panel's
  edge; from there the rate is `ceiling × (into / band)²`, clamped at
  `AUTO_SCROLL_CEILING` (1000 px/s) at and past the edge. **Quadratic rather
  than linear because of the case that decides it** — a slow extension of two or
  three lines. A linear ramp is already moving ~330 px/s a third of the way into
  the band, which is twenty lines a second when the reader wanted three; the
  square keeps the near two-thirds of the band at reading speed and still crosses
  a page in about a second at the edge.
- **The magnifier stays up across the break, showing the page the boundary is
  on.** It is drawn by whichever page holds the dragged anchor, so while the
  finger is over the gap the lens still shows the last line it can actually place
  a boundary on, and it moves to the next page the instant the boundary does.
  Task 4's own rule decided this: a lens that freezes or vanishes reads as the
  drag having ended.
- **A page whose geometry has not loaded is not waited for.** There is no glyph
  to ask for, so the boundary stays where it was and lands as soon as geometry
  arrives, while the paper keeps scrolling — which is exactly what happens today
  at a page's edge, and needs no new machinery. There is no public API to
  pre-request a page's geometry in any case: it is loaded when a page registers,
  or on demand by `setSelection`.

## Browser verification

Against the Compose app, 15-page *Attention Is All You Need*, at 109% zoom so a
page break and both its neighbouring lines fit on screen. Light and dark, at
1400px, 900px and 500px.

**How the gestures were produced:** dispatched `PointerEvent`s with
`pointerType: 'touch'`, with `setPointerCapture` and its release stubbed for the
length of each gesture — a synthetic pointer is not an "active pointer", so the
library's capture calls throw where a real finger's would not. **A real thumb is
still owed**, as it is for tasks 2, 4, 6 and 7.

**Confirmed:**

- **A handle dragged past the end of its page continues onto the next.** A hold
  on the last line of page 1, then the end handle dragged onto page 2's first
  paragraph: page 1 keeps 2 selection rects, page 2 gains 5, the start handle
  stays on page 1 and the end handle is drawn by page 2. Before this task the
  drag ended at that moment.
- **Dragging back contracts it**, and leaves nothing marked on the page it
  retreats from: 56 rects on page 2 → 0, back to one on page 1.
- **The copy control takes the whole passage, in reading order** — 499
  characters, page 1's tail, then page 2's heading and paragraph.
- **The auto-scroll matches the curve exactly.** With the finger 43px into the
  bottom band, `auto-scroll.ts` asks for 590 px/s and the paper moved at
  **590 px/s** measured. Near the band's inner edge (14px in) it asks for 63 and
  moved at **60** — about one line every 220ms, which is the case the curve was
  chosen for.
- **The dead band is dead.** A finger held 250px inside the panel moved the paper
  0px in 700ms.
- **Letting go stops it immediately**: 0px of further movement after the lift.
- **The lens stays up over the gap between two pages**, showing the page the
  boundary is on, and the boundary stays exactly where it was while the finger
  is there.
- **Nothing is left armed.** Four mouse moves across the paper after a crossing
  leave the selection untouched — the stale-anchor failure this feature has
  produced three times.
- Console clean apart from the theme hydration warning that predates this task.
- The article is back to the 7 annotations it started with, **deleted by the ids
  recorded when they were made**.

## What the browser corrected

**The auto-scroll ran at half the rate the curve asked for** — 295 px/s where
590 was asked, an exact halving that made it look like an arithmetic error and
was not. The loop was reading `viewport.getMetrics().scrollTop`, which is the
viewport plugin's *stored* copy of the offset, updated from the element's own
scroll event a frame or two later; adding a step to a stale base every frame
compounds into half the intended speed. The offset is now read from the panel
element and only the *write* goes through the plugin — see `readerPanelScroll`,
which carries the measurement. Re-measured after the change: 590 asked, 590
delivered.

## Two defects this verification found, both older than this task

Neither is caused by the change here, and neither is fixed by it. Recorded
because they were measured, not guessed.

- **A passage selected by touch cannot be marked at all.** Choosing a text tool
  while a touch selection is live clears the selection and creates nothing — on
  one page as much as across two. The cause is in the library: its markup tools
  commit from the selection plugin's `onEndSelection`, which is raised by its own
  pointer drag and never by a programmatic `setSelection`. So the whole touch
  path ends at the copy control, and task 4's selection has never been markable.
- **A mouse drag with a markup tool across a page break commits nothing**, though
  the same drag inside one page creates a row. Isolated by doing both: underline
  on page 1 alone → one `underline` row; the same tool dragged across the break →
  the markup is drawn on both pages and no row is created anywhere. The end of
  the gesture belongs to the page it finished on, which is not the page that
  began it.

This is what `constraints-and-behavior.md` assumed was already true ("a
text-markup tool marks all of it… already true of a pointer drag"). It is not,
and making it true is annotation-path work rather than selection work.

## Log

- 2026-08-23 — Filed mid-feature, when task 4's settled design made a single PR
  too large to review well.
- 2026-08-23 — Implemented and browser-verified. The design held; the numbers
  did not, until the browser showed the auto-scroll running at half the rate the
  curve asked for (above). The verification also found two older defects about
  *marking* a passage, which are recorded here and belong to a separate piece of
  work.
- 2026-08-23 — Started, after tasks 6 and 7 merged. The reading changed the
  shape of the work: the spec assumed a hit test and an auto-scroll bolted onto
  task 4, and what it actually needs first is **the drag lifted out of the page**
  — the grip that owns the gesture is unmounted by the very crossing this task
  exists to allow. Three open items settled with the user in the same sitting
  (above).
