# Status: Touch Scrolling

**State:** In progress. Second of four.

- Branch: `reader-touch-and-gestures/touch-scrolling`, from `main` at `3758b28`
  (task 1's merge).
- Sub-issue: [**#111**](https://github.com/nicbk/nicbk-website/issues/111).
- PR: opened once the unit tier and the browser pass are both clean.

## The re-decision this task forced

The task was spec'd to carry the whole touch model. Implementing it found that
**one third of that model cannot be built**, and the finding is recorded in
[reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
2026-08-22 revision rather than only here, because it corrects a decided
document.

In short: a browser latches its `touch-action` decision when a gesture begins,
so declaring the paper pannable — which is what makes scrolling work — means a
finger that later holds cannot reclaim that touch. "Long press, then drag to
select" required exactly that. Two supporting findings came out of the same
reading:

- **`wantsRawTouch` does not route touch.** The interaction manager attaches
  touch listeners only when `PointerEvent` is undefined, which on a current
  browser it never is. The flag's only real effect is whether `touch-action:
  none` is set.
- **The selection handler implements no `onPointerCancel`**, so a scroll that
  cancels the pointer stream leaves it holding an anchor it was never told to
  drop.

Settled with the user: **long press selects the word under the finger, and
handles extend it** — the platform-standard gesture, which does not contest
anything with the browser. That became task 4,
[`touch-selection`](../touch-selection/status.md), and this task shrank to the
scrolling the user actually reported.

## Open items, as settled

- **The `touch-action` value**: the pan axes are named rather than the property
  cleared. Clearing it would return the browser its own pinch-zoom and undo task
  1; naming both axes keeps pinch with the library while letting the browser
  pan. Both axes and not just the vertical one, because the viewport genuinely
  scrolls sideways whenever a zoom makes a page wider than the panel — its
  stylesheet already says so, and declares `overscroll-behavior` on both.
- **The lever is a mode, not CSS.** The interaction manager rewrites
  `touch-action` on every mode change, so a stylesheet setting the same property
  loses at the next tool switch. What the stylesheet may decide is the value the
  library clears *to*.

## Browser verification

Recorded here because both Playwright tiers are suspended. Exercised against the
Compose app with the 15-page Transformer paper, at 420px and 1200px.

**How it was driven, stated plainly:** by reading the computed `touch-action`
off real page elements in the running reader, and by dispatching `TouchEvent`s
and `WheelEvent`s. Native scrolling cannot be provoked by a synthetic touch —
the browser only pans for trusted events — so what is verified here is **the
whole mechanism that decides whether it scrolls**, not the scroll itself. See
*What is not verified* below.

**Confirmed**

- **The pages permit panning, and nothing overrides it.** `.pageLayers` computes
  to `touch-action: pan-x pan-y` with **no inline value** — so the engine cleared
  its own `none` and this project's stylesheet is what applies.
- **The ordering worry was unfounded, and now has evidence.** The mode had to be
  registered before the first page mounted, since a page fixes its
  `touch-action` when its listeners attach and activating an already-active mode
  returns early without emitting. On a cold load no page carried an inline
  `none`, which is what that would have looked like.
- **The mode split works in both directions.** With no tool: `pan-x pan-y`,
  inline cleared. Choosing *freehand*: inline `none` on every page, so a drag
  draws. Escape: back to `pan-x pan-y`. Not once — checked through the cycle.
- **The scroll it hands to the browser is the right one.** The viewport is
  genuinely scrollable (10117px of content in a 652px region) and carries
  `overscroll-behavior: contain` on **both** axes, so a pan stops at the panel's
  end rather than dragging the page behind it — the decided rule, still intact.
- **Task 1 is not regressed.** Two-finger pinch still zooms and the arithmetic is
  still exact (328% → 164% when the spread halved); ctrl+wheel still zooms and
  still comes back `defaultPrevented`. This was the named risk of this task and
  it did not land.
- **Pointer text selection still works** — dragging across the abstract selected
  it and raised the copy control. This is what would have broken had the mode
  been registered under a name of its own, and is why it is checked rather than
  assumed.
- Both themes; 420px and 1200px.

## What is not verified, and is owed

- **That a thumb on real glass scrolls the paper.** No synthetic touch can prove
  it: the browser pans only for trusted events. Every link in the chain that
  decides it is verified above — the property, the value, which element carries
  it, the scrollable ancestor and its overscroll rule — but the gesture itself
  needs a phone. It is the reported defect, so it is the thing to try first.

## An observation to raise, not fixed here

**A touch that starts on an existing mark will move the mark, not scroll the
paper.** EmbedPDF gives every rendered annotation its own inline
`touch-action: none` so it can be dragged, and that is untouched by this task —
correctly, since it mirrors what a pointer does. But on a heavily annotated page
it means islands that do not scroll, which a reader would experience as the fix
working intermittently. Out of scope here and not obviously wrong; worth a
decision with the user rather than a silent change.

## Log

- 2026-08-18 — Filed with the feature, spec'd at the depth the research
  supported. Not started; task 1 went first because this one could undo it.
- 2026-08-22 — Started after task 1 merged and its tip was verified. The touch
  model was re-decided with the user before any code was written (above), the
  task re-scoped to scrolling alone, and task 4 filed for what moved out.
- 2026-08-22 — Implemented and browser-verified (above). The change is one flag
  and one CSS declaration, which is the whole point: the reader was not missing
  a capability, it was holding one down. No defect found; one observation about
  annotations being scroll islands raised for a decision rather than fixed.
