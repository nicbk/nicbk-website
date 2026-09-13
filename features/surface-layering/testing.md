# Testing: Surface Layering

Feature-wide tiers. Each task's own file narrows these to what it must cover.

## Unit (Vitest, jsdom)

jsdom does not lay out or paint, so **it cannot answer "what is on top"**. That
is stated here so no task tries: a jsdom assertion that an element "is above"
another would be a test of nothing, passing in both the fixed and broken states.

What the unit tier *can* hold is the **declaration**: that the page carries
isolation, that the toolbar carries a z-index, and that the two travel together.
That is a stylesheet fact, so it is asserted against the compiled CSS module
rather than against a rendered tree — the point being that deleting
`isolation: isolate` as redundant fails a test rather than silently restoring
two production defects.

## Integration (Testcontainers)

Not applicable. Nothing here touches the database, the queue, or storage.

## Browser verification (record in each task's status.md — primary evidence)

**Both engines, every time.** Chrome and Safari, and a pass in one is not
evidence about the other — that is the finding this feature exists because of.

Method, for every layering claim:

1. Get both elements' rectangles and **assert they overlap**. A probe outside
   the overlap region proves nothing and must not be able to pass.
2. `elementFromPoint` at the centre of the overlap.
3. Report which element received it, by identity — not by eye, and not from a
   screenshot.

Task 1:

- Toolbar above the cards, scrolled, at a wide and a narrow width.
- Card menu overlapping the toolbar → the menu receives the probe.
- Upload modal open → a point over the toolbar receives the **backdrop**.
- Finally on `nicbk.com`, in Safari, because that is where it was reported.

Task 2:

- Annotation box above the reader toolbar where they overlap.
- **The old defect as a regression test**: page one must not receive a probe
  over the toolbar. This is the report the current rule was added for, and the
  one most likely to come back.
- Both themes, and a narrow width, since the reader's toolbar moves.

## Coverage

Ratchet applies. The code is small and mostly CSS; the stylesheet assertions are
what keep the ratchet honest rather than new component branches.
