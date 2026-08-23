# Status: Pinch Without Selecting

**State:** **In review** — implemented, browser-verified, and
[PR #125](https://github.com/nicbk/nicbk-website/pull/125) is open with CI green.

Seventh of seven, added mid-feature, and **run before task 5** — like task 6, it
repairs behaviour the reader already has in front of them.

- Branch: `reader-touch-and-gestures/pinch-without-selecting`, from `main` at
  `0907859`.
- Sub-issue: [**#122**](https://github.com/nicbk/nicbk-website/issues/122).
- PR: [**#125**](https://github.com/nicbk/nicbk-website/pull/125), CI green.
- The close-#108 duty stays with
  [`selection-across-pages`](../selection-across-pages/status.md), still the last
  task to merge.

## Why this task exists

Reported by the user on 2026-08-23, in the same message as the two symptoms that
became **#14**: pinching on a touchscreen either selects text or trips the live
tool.

## What the reading found, before anything was designed

Verified against the installed EmbedPDF 2.15.0:

- **There is no multi-touch guard anywhere in the pointer path.**
  `plugin-interaction-manager/dist/react/index.js` translates every pointer event
  from every finger into the page's handler chain. The zoom wrapper's own pinch
  listens to `touchstart`/`touchmove` on the viewport and acts at
  `e.touches.length === 2` — it never takes the gesture away from anything.
- **The text handler clears the selection on *every* press**
  (`plugin-selection/dist/index.js`: `onPointerDown` calls `onClear` before it
  anchors, outside the triple-click window). So the finger that starts a pinch
  destroys an existing selection before the pinch is knowable — which is why
  this task has to *restore* one rather than merely refrain from clearing it.
- **It anchors on that press and begins a drag selection 3 page units later**,
  which is the "pinching selects text" half.
- **Task 4's move-withholding stops at the second finger.** Its handler ends the
  press in flight when another arrives (`a second finger is a pinch, not a
  hold`), and its `onPointerMove` guard only fires while a press is in flight —
  so from that instant the library hears every movement again.
- **The tools' `onPointerUp` begins `if (!start) return`.** A tool that has been
  told its pointer was cancelled ignores a later lift, which is what makes
  "cancel the tool, let the lifts through" safe.
- **`interaction.pause()` exists but only sets a flag** — no handler is
  notified, and this reader's own guards would go silent with the library's. It
  is the obvious tool and it is the wrong one.

## Open items, as settled

- **The multi-touch count lives in a `pinch/` folder of its own**, beside
  `touch-selection/` rather than inside it: what a second finger means is a
  question about the hand, not about selecting. `pinch.ts` decides *when* a
  gesture is a pinch, `pinch-guard.tsx` withholds it from the library per page,
  and `use-pinch-recovery.ts` repairs what the first finger did — one decision
  per file, as everything else in this reader is arranged.
- **The selection is put back, not protected.** The first press cannot be
  withheld — a press cannot know a second finger is coming, and a *tap* on the
  paper is supposed to clear a selection — so what was selected is remembered as
  the finger lands and restored if the gesture turns out to be a pinch. Only
  when the pinch is what emptied it: if something is selected when the second
  finger arrives, it is left alone.
- **The cancel machinery moved** to `cancel-pointer.ts`. Two callers now — the
  click that puts a mark down, and the second finger of a pinch — and a shared
  function belongs in a module rather than inside one of its callers.
- **`interaction.pause()` was not used.** It exists and looks exactly right, and
  it only sets a flag: no handler is notified, so everything in flight stays in
  flight — and it would silence this reader's own guards along with the
  library's.

## What the tests changed about the design

**One listener, not two.** The first version had `use-pinch-recovery.ts` keep a
window listener of its own to notice the first finger, beside the one `pinch.ts`
already had. Which ran first depended on which component mounted first — and
mounted the wrong way round, the *second* finger's press overwrote the very
selection the restore existed to put back. A unit test caught it before the
browser did; the fix was to stop having two listeners to order, so both moments
are now told by the one.

That is the same family as this feature's other three: state that depends on the
order two things were registered in. `AGENTS.md` records the rule about
withholding a dependency's input; this one is its mirror — **when two of your own
listeners answer the same event, their order is a fact you have to decide rather
than inherit.**

## Browser verification

Against the Compose app, 15-page *Attention Is All You Need*, at 500px and
1400px, both themes.

**How the second finger was produced, stated plainly:** dispatched
`PointerEvent`s **plus the `TouchEvent`s the zoom wrapper listens for** — it
reads `e.touches.length === 2` from its own listener on the viewport, so a
pointer-only gesture would never have zoomed anything. `setPointerCapture` and
its release are stubbed for the length of each synthetic gesture: a synthetic
pointer is not an "active pointer", so the library's capture calls throw where a
real finger's would not. That stands in for what the browser provides rather than
changing what is being tested. **A real thumb is still owed.**

**Confirmed** — the whole of the decided table:

- **A passage stays selected through a pinch.** 74% → 149%, and the selection's
  page-relative geometry is identical before and after (x 0.235, y 0.520, w
  0.511), with the copy control still up. Before this task, the same gesture
  emptied it.
- **A pinch with nothing selected selects nothing**, and the copy control never
  appears.
- **A pinch with a tool live draws nothing.** Rectangle tool selected: the page
  drew 30 elements before, during and after — no preview at any point — and the
  database went 7 → 7. The paper zoomed 74% → 137% throughout.
- **A mark stays selected**: 137% → 79%, and the reader still reports a mark
  selected afterwards.
- **The gesture leaves nothing armed.** Four mouse-moves across the paper right
  after a pinch drag out no selection — the stale-anchor failure this feature
  has produced three times.
- **One finger is untouched.** With the tool still live, a one-finger drag draws
  a rectangle as it always did (row created, then deleted by its recorded id);
  with no tool, a 500 ms hold still selects the word under the finger and grows
  both handles (task 4 intact through the changed registration order).
- Console clean apart from a theme hydration warning that predates this task.
- The article is back to the 7 rows it started with, deleted **by the ids
  recorded when they were made**.

## What the browser corrected, and what nearly went unnoticed

**The dev server had stopped seeing edits**, and every measurement taken before
that was found was against `main`'s code wearing this branch's name. The cause:
`npm run test:coverage` writes `coverage/` **inside the bind mount**, and the
container's polling watcher — thousands of new files at once — quietly stopped
updating the module graph. Vite went on serving a stale transform, a hard reload
changed nothing, and the symptom looked exactly like a bug in this task's logic.

Found by asking the page a question with an unambiguous answer: a
`console.log` at module scope in `pinch.ts` that never appeared. The fix was
`rm -rf coverage` and a restart. **The general lesson: when the browser
contradicts a unit test that passes, prove the browser is running your code
before believing anything it says.**

## What is not verified, and is owed

- **A real two-finger pinch, on glass.** Everything above is synthetic, and a
  synthetic gesture cannot show what the browser itself does with the fingers.
  The same debt tasks 2, 4 and 6 carry.

## Log

- 2026-08-23 — Filed, from the user's report, after reading the library's pointer
  path. Placed ahead of task 5 for the same reason task 6 was.
- 2026-08-23 — Implemented and browser-verified. The design held. What did not
  was the first arrangement of the listeners (above), and — for an hour — the
  dev server's belief about what the source said.
