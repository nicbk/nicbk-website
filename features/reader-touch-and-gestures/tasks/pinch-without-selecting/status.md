# Status: Pinch Without Selecting

**State:** Not started. Seventh of seven, added mid-feature, and **run before
task 5** — like task 6, it repairs behaviour the reader already has in front of
them.

- Branch: `reader-touch-and-gestures/pinch-without-selecting`, from `main`.
- Sub-issue: [**#122**](https://github.com/nicbk/nicbk-website/issues/122).
- PR: opened once the unit tier and the browser pass are both clean.
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

## Open items, to be decided in implementation

- **Where the multi-touch count lives.** `touch-selection/pointer-kind.ts`
  already keeps a window-level capture listener describing the pointer in flight,
  and this needs the same shape one level up: how many touch pointers are down.
  Extending it or adding a sibling beside it is the choice; the listener must
  stay one per reader either way.
- **How the selection is put back.** The range is known before the library
  clears it — this reader's guards register in a layout effect and so run
  first — and task 4 already writes selections with `setSelection`. What is
  unsettled is *when* to read it, and whether the restore belongs to this guard
  or to the touch-selection folder that owns the rest of the selection work.
- **Whether the cancel machinery moves.** `click-away-guard.tsx` holds
  `tellTheToolItsPointerWasCancelled`, which this needs verbatim. Two callers
  means it belongs in a module of its own rather than being imported out of a
  component.

## Log

- 2026-08-23 — Filed, from the user's report, after reading the library's pointer
  path. Placed ahead of task 5 for the same reason task 6 was.
