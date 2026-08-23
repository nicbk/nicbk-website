# Constraints and Behavior: Touch Selection

The selecting half of the feature's **"Scrolling and selecting by touch"**,
restated against the model decided on 2026-08-22 — the feature's own criteria
still describe the superseded one, and this file is the accurate statement.

## Satisfied here

- **A long press with no movement selects the word under the finger.**
- **Each end of the selection carries a handle**, and dragging one extends or
  contracts the selection.
- **A selection made by touch is an ordinary selection**: the copy control
  appears over it, ⌘C copies it, Escape drops it, and a text-markup tool applies
  to it. Nothing downstream may need to know how it was made.
- **Dragging a handle never scrolls the paper**, and scrolling the paper never
  moves a handle.

## Must not regress

- **Touch scrolling**, task 2's whole subject: a drag that is not a hold and not
  on a handle still scrolls. This is the balance to hold, and the likeliest
  thing to break.
- **Two-finger pinch**, task 1's.
- **Pointer selection**, unchanged since #9 and not to acquire handles.
- **Drawing with a live tool by touch**, which must still take the drag.

## Constraints particular to this task

- **The hold must not fire when the finger moves.** A press that becomes a
  scroll is a scroll; the movement threshold is as much part of the gesture as
  the duration, and both need settling on a real device rather than picked from
  a table.
- **The hold must not fire while a tool is active**, where press-and-drag means
  draw.
- **A handle is a real hit target.** The decided minimum touch target applies —
  a handle sized to its own graphic would be unusable, so its hit area is larger
  than it looks.
- **Handles must not obscure the words they bound.** They sit at the ends of the
  selection, and a handle drawn over the first and last characters hides exactly
  what the reader is trying to judge.
- **A hold that takes must be perceptible.** A gesture that changes meaning
  mid-press with no feedback reads as a bug; the selection appearing under the
  finger may itself be enough, and whether more is wanted is a judgement to make
  in use.
- **The browser's own long-press behaviours must not also fire** — the callout,
  the context menu, and the native selection UI have to be suppressed on the
  page, or the reader gets two selection affordances at once.
- **Decompose so the decision is testable without a DOM.** The hold predicate
  (elapsed time and movement against thresholds) is pure logic; so is the
  word-boundary expansion, which is a call into the library over its geometry.

## Cross-cutting

- WCAG 2.2 AA: selection stays reachable by pointer and the copy control by
  keyboard, so nothing here becomes touch-only. Handles are a touch affordance
  and are not the only way to adjust a selection.
- Both themes; narrow, mid and wide — narrow most of all.
- No stored data, no schema change, no new mutator.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
