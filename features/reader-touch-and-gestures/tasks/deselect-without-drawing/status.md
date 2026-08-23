# Status: Deselect Without Drawing

**State:** In progress. Sixth of six, added mid-feature, and **run before task
5** — it repairs behaviour the reader already has in front of them.

- Branch: `reader-touch-and-gestures/deselect-without-drawing`, from `main` at
  `9e80674` (task 4's merge).
- Sub-issue: [**#118**](https://github.com/nicbk/nicbk-website/issues/118).
- PR: opened once the unit tier and the browser pass are both clean.
- The close-#108 duty stays with
  [`selection-across-pages`](../selection-across-pages/status.md), which is
  still the last task to merge.

## Why this task exists

The user reported it on 2026-08-24, after task 4 merged: with a tool live, click
away from a selected mark and a new shape follows the cursor, as if one were
being sized, until the next press.

**It is task 3's fix, meeting the plugin's bookkeeping.** Every tool that draws
by dragging starts on pointer-down and clears what it started on pointer-up or
pointer-cancel — nowhere else. Task 3 withholds exactly that pointer-up, so the
tool was left holding a start point, and every mouse-move after it recomputed a
preview from that point to the cursor.

**This is the third time in this one feature that withholding an event has left
a library holding state**, after the two task 4 found in the selection plugin.
That is no longer a coincidence, and the general rule is recorded in
[AGENTS.md](../../../../AGENTS.md) rather than only here.

## Decided with the user, 2026-08-24

The behaviour, in their words, restated as a table:

| | mouse | touch |
|---|---|---|
| press, release without moving | deselects; nothing drawn, nothing follows the cursor | deselects; nothing drawn |
| press, then move | draws the shape dragged out | pans the paper; **the mark stays selected**; nothing drawn or sized |

- **The mouse column keeps task 3's criterion**: a drag creates. It was raised
  explicitly as the thing that would be lost by the simpler fix, and kept.
- **The touch column is new, and is the half with substance.** A live tool
  claims every touch today so that a drag can draw; while a mark is selected
  that claim is suspended, the paper pans, and drawing resumes the moment the
  mark is put down.

## Open items, as settled

- **Where the press is stopped depends on where its tool acts.** Tools that draw
  by dragging are judged at the release, so a drag can still create. The
  **sticky note commits at pointer-down**, so its press is stopped at the start
  — otherwise the note is already made by the time anything could judge it.
  Found by reading the plugin, not reported: that hole has been open since #9.
- **The tool is told its pointer was cancelled** when a click is withheld from
  it. Its `onPointerCancel` drops the start point, the preview and the pointer
  capture — the exact bookkeeping the swallowed pointer-up would have done, and
  the only route to it that keeps a drag able to create.
- **Panning while a mark is selected is bought with `!important`.** The
  interaction manager writes `touch-action` inline on every page and models no
  "something is selected" state; a stylesheet rule outranking the inline value,
  scoped to that state, is the one lever that fits. Given back the moment
  nothing is selected.

## Browser verification

Recorded here because both Playwright tiers are suspended. Exercised against the
Compose app with the 16-page BERT paper, counting rows in the database at every
step rather than trusting the paper, and counting elements inside a page to see
what was being *drawn* — a half-made shape is a handful of elements that appear
while a press is in flight, which is precisely what the defect left behind.

**How it was driven, stated plainly:** by dispatching `PointerEvent`s of each
kind. A synthetic pointer never pans, so the touch column's *scrolling* is
verified by its mechanism — `touch-action` computed off the real element through
the whole cycle — rather than by the paper moving.

**Confirmed**

- **The reported defect is gone.** With a rectangle tool live: draw a mark (the
  page gains its elements), click away — the mark deselects and the page settles
  — then move the mouse across it four times: **nothing changes**. Before the
  fix, each move recomputed a shape from the old press to the cursor.
- **Nothing is created by that click**, counted: 19 → 20 for the drawn mark, and
  20 after the click-away.
- **A drag still creates**, on the very next press, and again from a press begun
  while a mark was selected.
- **The sticky note leaves nothing behind**: with that tool live and a mark
  selected, clicking away deselects and the count does not move. Placing one
  with nothing selected still works.
- **Touch, with a tool live and a mark selected**: the page computes to
  `touch-action: pan-x pan-y` — the browser has the gesture — and a press then a
  drag draws **nothing** and leaves the mark **selected**. A tap deselects it,
  and the page returns to `touch-action: none` in the same moment, so the very
  next finger drag draws again.
- **Task 4 is intact**: a hold still selects a word, and dragging its end handle
  still moves the boundary (296px → 383px) with the magnifier up.
- **Tasks 1 and 2 are intact**: with no tool live the pages compute to `pan-x
  pan-y`, and ctrl+wheel still zooms (76% → 229%, `defaultPrevented`).
- Both themes; 500px and 1400px.
- Every test mark removed afterwards; the article is back to the 19 rows it
  started with.

## What the browser corrected in the design

- **The cancel has to be aimed at what the press landed on**, not at the page.
  The tool captures the pointer on the press's own target — usually the page
  image — and the plugin releases that capture from whatever element the cancel
  arrives on. Aimed at the page, the release is refused and the plugin throws
  where nothing can catch it. Seen as an uncaught `NotFoundError` in the console
  before the aim was corrected.
- **And the release has to be allowed to fail.** The plugin lets go
  unconditionally; the browser may already have done it. The method is made
  conditional for the length of that one synchronous dispatch, which is the
  difference between a clean console and one carrying an exception per click.

## What is not verified, and is owed

- **That a thumb actually scrolls the paper while a mark is selected.** A
  synthetic touch never pans — the browser only pans for trusted events — so
  what is checked is the whole mechanism that decides it. The gesture itself
  needs a phone, as it did for tasks 2 and 4.

## Log

- 2026-08-24 — Filed, after the user reported the defect and specified the
  behaviour for both kinds of device. Placed ahead of task 5 because it repairs
  shipped behaviour.
- 2026-08-24 — Implemented and browser-verified (above). The design held; two
  details of *how* the tool is told did not, and both were found by watching the
  console rather than the page. Also corrected on the way through: four test
  files claimed jsdom implements no `PointerEvent` — it has since version 24,
  and this project runs 29 — so they now raise the real thing. A false statement
  in a comment is worse than none, because the next reader takes it as a
  finding.
