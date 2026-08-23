# Constraints and Behavior: Pinch Without Selecting

Which of [#12's acceptance criteria](../../constraints-and-behavior.md) this task
satisfies:

- *Zooming by gesture* — **"A two-finger pinch on a touchscreen zooms the paper,
  over the document and while any tool is active or none is."** Task 1 made the
  paper zoom; this makes that the *only* thing the gesture does, which is what
  the criterion means by "zooms the paper".
- *Scrolling and selecting by touch* — **"Two fingers always pinch, whichever of
  the above is true."** Today two fingers pinch *and* select, or pinch *and*
  draw.

## The behaviour, decided

Stated by the user on 2026-08-23: pinch zooming "should just make the page
smaller or bigger without either selecting new text or affecting already selected
text".

| during a two-finger pinch | must happen | must not happen |
|---|---|---|
| no tool live, nothing selected | the paper zooms | text is selected |
| no tool live, a passage selected | the paper zooms, **the passage stays selected** | the selection is cleared, changed, or extended |
| a tool live | the paper zooms | a mark is created, sized, or previewed |
| a mark selected | the paper zooms, the mark stays selected | the mark is deselected or moved |

And after every one of them: **the gesture leaves nothing armed.** The press
that follows a pinch behaves as if the pinch had never happened — no drag
selection trailing a stale anchor, no half-made shape, no hold in flight.

## Constraints

- **One finger keeps behaving exactly as it does today.** A press cannot know a
  second finger is coming, so nothing may be deferred or dampened on the chance
  that one is: scrolling, the long press, the tap that puts a mark down and the
  drag that draws must all still act on the first press alone.
- **Whatever is withheld from the library, its bookkeeping is this project's**
  (`AGENTS.md`). The tool clears an in-flight draw on pointer-up or
  pointer-cancel and nowhere else; the selection plugin's text handler drops its
  anchor on pointer-up and nowhere else — it implements no cancel. A fix that
  suppresses the visible half and strands the invisible half is the failure mode
  this feature has already produced three times.
- **`interaction.pause()` is not sufficient by itself.** It exists, but it only
  sets a flag: no handler is notified, so everything in flight stays in flight —
  and it would silence this reader's own guards along with the library's.
- **The pinch must keep working with a tool live**, where the pages carry
  `touch-action: none`. That is a decided behaviour (task 2), not an accident.
- Accessibility unchanged: zoom stays reachable from the toolbar, so nothing
  here becomes a path only a multi-touch device can walk.
- No new stored data, no schema change, no route.
- CI green: Biome, typecheck, unit + integration, ratchet coverage, PR-title
  lint.

## Out of scope

- **Two-finger panning.** The browser pans a zoomed page; this task does not add
  a gesture.
- **Three or more fingers.** Anything past the second is treated as part of the
  same multi-touch gesture, not given a meaning of its own.
- **The zoom's own maths, anchoring, or limits** — the library's, and #14's.
