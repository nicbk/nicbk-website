# Plan: Reader Touch and Gestures

> **Revised 2026-08-22**, then **2026-08-23**, then **2026-08-24.** Six tasks,
> not three. First, task 2's implementation proved part of the decided touch
> model unbuildable and the risk this plan names at the bottom landed. Then task
> 4's settled design made it four subsystems in one PR, and its cross-page half
> became task 5. Then the user reported what task 3's fix had left behind, and
> that became task 6 — the first task here filed against a defect this feature
> itself introduced. What follows is the original sequence, amended where each
> changed it — see [status.md](./status.md)'s log.

Six tasks, sequential, each gated by its own PR + CI + human review. The order
is not arbitrary: **task 2 can undo task 1 if it is done first**, task 3 is
independent of both, and task 5 builds directly on task 4.

**Numbers are filing order; task 6 runs before task 5.** It repairs shipped
behaviour and task 5 adds some, so the repair goes first — renumbering an issue
that already carries its name would be churn for its own sake.

## Task sequence

### 1. [`gestures`](./tasks/gestures/status.md) — pinch, on a trackpad and a touchscreen

Mount EmbedPDF's `ZoomGestureWrapper` inside the reader's viewport, with both
`enablePinch` and `enableWheel`. This is the smallest task and the one with the
least of this project's own code in it — the component exists, ships both
gestures on by default, and was simply never rendered.

First because it is the one task whose result the next task must not break: with
`touch-action: none` in place today, two-finger touch events reach the page
uninterrupted, so touch pinch works *before* the touch model changes and must go
on working after. Doing this first makes that a regression the next task can be
checked against rather than a behaviour it has to invent.

### 2. [`touch-scrolling`](./tasks/touch-scrolling/status.md) — one finger scrolls

Stop the reader claiming every touch, so a one-finger drag scrolls, while a live
tool's mode keeps raw touch and the two-finger gesture stays with task 1.

**Now smaller than planned.** It was to carry the whole touch model; the
long-press half proved unbuildable and moved to task 4. What remains is
configuration of a lever the library already has — and it is the part the user
actually reported.

The interaction with task 1 is the thing to watch: clearing `touch-action`
entirely would hand pinch back to the browser and undo task 1, so the pages must
permit panning while reserving pinch (`touch-action: pan-y`, or whichever axis
the scroll strategy uses).

### 3. [`click-away`](./tasks/click-away/status.md) — deselect without creating

Make the click that deselects a mark spend itself on deselecting. Independent of
the other two — it is a pointer behaviour, touched by no gesture — so it is last
by size rather than by dependency, and could equally be first if the touch work
turns out to need splitting.

### 4. [`touch-selection`](./tasks/touch-selection/status.md) — long press selects, handles extend

Added 2026-08-22. Selecting a passage with a finger, under the corrected model,
**within one page**. After task 2 because it depends on the paper having been
given back to the browser, and because the gap it leaves open — no touch
selection at all — is the price already agreed for shipping scrolling first.

**Smaller than filed, by one half.** Its three open design questions were
settled on 2026-08-23 toward what a phone already does — iOS-shaped handles,
character-precise extension, a magnifier to aim with — and crossing a page break
moved to task 5 so that neither PR carries four subsystems.

### 6. [`deselect-without-drawing`](./tasks/deselect-without-drawing/status.md) — the press that deselects, spent

Added 2026-08-24 from a user report, and **run before task 5**: it repairs
behaviour the reader already has in front of them, which task 5 does not.

Task 3 withheld the deselecting click from the live tool; the tool clears what a
press started only on pointer-up or pointer-cancel, so withholding the up left it
mid-draw and a shape followed the cursor. The fix tells the tool its pointer was
cancelled, stops the press at its *start* for the one tool that creates there,
and — on touch — suspends the tool's claim on the gesture while a mark is
selected, so a finger pans instead of drawing.

### 5. [`selection-across-pages`](./tasks/selection-across-pages/status.md) — past the page break

Added 2026-08-23. A handle dragged past the end of its page continues onto the
next, and the paper scrolls under the finger while it is held at the panel's
edge.

Last because it is task 4's work extended, not beside it — and split at this
seam so the state between the two PRs is a finished thing that stops at a page
edge, rather than a half-built one.

## What this plan deliberately does not do

- **It does not reverse either decision that produces the task-3 defect.** The
  sticky tool and the engine's click-to-create are both wanted; the fix is to
  remove what they produce *together* on one specific click.
- **It does not add a gesture vocabulary.** Every gesture here has an existing
  non-gesture equivalent, which is what keeps the accessibility criterion
  satisfiable.
- **It does not touch layout.** #9 verified the reader at 420px; this feature
  changes what a hand does, not where anything sits.

## Risk, and what became of it

The long press was named here as the only part of this feature that could fail
to be buildable as decided, with the fallback written down: raise it and
re-decide with the user rather than ship a gesture that half-works.

**It failed, and the fallback was taken as written.** Not for the reason
anticipated, though — the guess was that EmbedPDF's selection model might not be
drivable from a synthetic hold, and in fact it is (`glyphAt`,
`expandToWordBoundary` and `setSelection` are all public). What could not be done
was reclaiming a gesture from the *browser* after declaring the paper pannable.
The risk was correctly located and incorrectly explained, which is worth
recording: naming where a plan is fragile is useful even when the reason turns
out to be the wrong one.
