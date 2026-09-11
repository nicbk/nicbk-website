# Status: Ending a Selection

**State:** **In progress** — implemented and browser-verified; PR next.
First of two.

- Branch: `reader-marking-a-passage/ending-a-selection`, from `main` at
  `dd34474`.
- Sub-issue: [**#129**](https://github.com/nicbk/nicbk-website/issues/129).
- PR: opened once the unit tier and the browser pass are both clean.
- The close-#15-by-hand duty belongs to
  [`marking-from-the-selection`](../marking-from-the-selection/status.md), the
  last task to merge.

## Why this task exists

Measured on 2026-09-11, after #12's task 5 asserted behaviour that turned out
not to exist. The library never emits its end-of-selection event for a drag
released over another page, nor for a selection applied through the public API;
everything downstream waits on that event and silently does nothing. See the
feature's [research.md](../../research.md) for the two code paths.

## Open items, as settled

- **Fed by one listener of its own, at the window, on the bubble phase** — the
  opposite of everything else in this reader, and the reason is the whole point:
  the question is *whether the library finished the selection*, so it has to be
  asked after the library's own page listener has had the pointer-up. Asked
  earlier it would answer "no" for every ordinary drag and finish selections
  that were about to finish themselves. The library binds to the page element
  and never stops the native event, so the bubble is reliable.
- **No ordering against this project's own listeners has to hold**, which is the
  answer `AGENTS.md` asks for rather than a coincidence: the decision is read
  from the library's flag at the moment this runs, and acting clears that flag,
  so anything arriving later finds nothing to do. That is why this did not need
  to ride `touch-selection/`'s existing listeners — there is no order to choose.
- **The touch path needed nothing, and the smaller answer won.** A programmatic
  selection leaves `selecting` false, so the copy control already appears for
  one; and a markup tool cannot be live while a touch selection exists, because
  picking one clears it. So "a programmatic selection counts as finished" would
  have been machinery with no consumer. The feature's
  [constraints](../../constraints-and-behavior.md) list it under what this task
  satisfies; it is satisfied by the library's own behaviour rather than by code
  written here, and **task 2 is what makes a touch selection markable**.
- **Two endings, not one.** With a text tool live the passage is marked and the
  selection cleared — which is what EmbedPDF's own handler does, and clearing
  resets the flag on its own. With no tool, the range is re-applied, which is
  what clears the flag and brings the control back. Each branch does one thing.

## Browser verification

Against the Compose app, *Attention Is All You Need* at 109% with a page break
on screen. Light at 1400px and dark at 500px.

**Confirmed** — every line of [testing.md](./testing.md):

- **A markup tool dragged across a page break marks both pages.** Highlight at
  1400px: two rows, `page_index` 0 and 1, each with that page's own
  `segmentRects` (2 and 4) and both quoting the passage's 343 characters. The
  measurement to beat was **zero rows and zero engine events**.
- **The mark is indistinguishable from a toolbar-made one.** A single-page
  highlight made the ordinary way, in the same sitting, stored identical
  `color` `#FFCD45`, `opacity` and `blendMode`; both appear in the sidebar
  quoting their passage, and clicking either raises the same floating menu with
  *write a note* and *delete annotation*.
- **A cross-page selection offers `copy`** — at 1400px light and 500px dark
  (7 rects on one page, 11 on the next) — and copying takes the whole passage,
  343 characters in reading order. It was absent before this task.
- **A single-page markup drag is unchanged**: one row, as before.
- **Underline across a break at 500px in dark mode**: two rows, so the branch
  is not highlight-specific.
- **Everything #12 shipped still works**: a hold selects a word and grows both
  handles, a handle drags across the break with the lens up, and the copy
  control appears for a touch selection.
- **Nothing is left armed**: after Escape, four pointer moves across the paper
  drag out no selection.
- Console clean apart from the theme hydration warning that predates this task.
- The five marks made while verifying were **deleted by the ids recorded when
  they were made**; the user's own four articles still hold 7, 3, 2 and 5.

## What the verification corrected about the method

**A JS-dispatched `PointerEvent` does not drive the library's mouse selection**,
and for half an hour that looked like a defect at narrow widths: the same drag
that worked at 1400px appeared to select nothing at 500px and then at 900px.
Both "failures" were the *method* — the wide-window runs had used the browser's
own input, the narrow ones a synthesised event. With real input at 900px and
500px, selection works. The synthetic *touch* helpers this project has used
since #12's task 4 are unaffected, because they drive this reader's own
handlers rather than the library's.

Recorded because it is a trap this project will meet again: **synthetic events
are a substitute for a finger, not for a mouse.**

## Log

- 2026-09-11 — Implemented and browser-verified. The design held; two of the
  three open items dissolved rather than being answered (above), and the method
  needed correcting once.
- 2026-09-11 — Filed with the feature.
