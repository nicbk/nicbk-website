# Constraints and Behavior: Touch Scrolling

The subset of [the feature's criteria](../../constraints-and-behavior.md) this
task satisfies — the whole of **"Scrolling and selecting by touch"**.

## Satisfied here

- One finger dragging the paper scrolls it, with no annotation tool active.
- A long press followed by a drag selects text, and from there the selection
  behaves exactly as a pointer-made one: the copy control appears over it, ⌘C
  copies it, Escape drops it.
- A live drawing tool takes one-finger drags back; putting the tool down returns
  the drag to scrolling.
- Two fingers always pinch, under every one of the above.
- Touch scrolling stops at the end of the reader's own scroll container rather
  than chaining into the page behind it.

## Must not regress

- **Task 1's pinch.** Explicitly a criterion of this task, not an assumption:
  the touch-action value chosen here decides whether the library still receives
  the two-finger gesture at all.
- **Drawing by touch**, which works today because every page carries
  `touch-action: none`. After this task it must work only while a tool is
  active — but there, unchanged.
- **Every pointer interaction.** Mouse and trackpad selection, drawing,
  clicking, and the mark's floating menu are untouched by this task.

## Constraints particular to this task

- **The touch model is per interaction mode, not per element.** The lever is
  `wantsRawTouch` on the mode, which the interaction manager reads to decide
  both its listener options and the element's `touch-action`. Implementations
  that set `touch-action` directly on the reader's own CSS are fighting the
  library for the same property and will drift the moment a mode changes.
- **The long press must not fire on a scroll.** A finger that moves before the
  hold elapses is scrolling and must stay a scroll; the movement threshold and
  the duration are both part of the gesture, not just the duration.
- **The long press must not fire while a tool is active**, where a press-and-
  drag means "draw".
- **A hold that becomes a selection should be perceptible.** A gesture that
  silently changes meaning mid-press is the kind of thing that reads as a bug;
  whether that feedback is haptic, visual, or the selection simply appearing is
  an implementation decision to make in the browser, and to record.
- **Decompose so the decision is testable without a DOM.** The hold predicate —
  elapsed time and movement against thresholds — is pure logic and belongs in
  its own module, per this feature's testing plan.

## Cross-cutting

- WCAG 2.2 AA: nothing here becomes reachable only by touch. Text selection
  stays available to a pointer, scrolling to the keyboard, and every annotation
  tool to both.
- Both themes; narrow, mid and wide — the narrow widths especially, since that
  is where touch is actually used.
- No stored data, no schema change, no new mutator.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
- **If the long press proves unbuildable on EmbedPDF's model, stop and
  re-decide with the user** rather than shipping a partial gesture. Scrolling is
  the part that must ship; selection by touch was chosen knowing it was
  uncertain.
