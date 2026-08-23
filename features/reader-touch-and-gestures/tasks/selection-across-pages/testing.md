# Testing: Selection Across Pages

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Which page a viewport point falls in**, as a pure function over the
  visibility metrics the scroll capability reports: a point inside a page, a
  point in the gap between two pages, a point above the first and below the last
  visible page.
- **What scroll rate an edge distance implies**: nothing while the finger is
  inside the panel, growing as it goes past the edge, and clamped at the top.
- **The range a cross-page drag produces**, including the ordering case — a
  handle dragged onto an *earlier* page, where start and end swap.
- **Task 4's within-page behaviour is unchanged**, exercised through its own
  suite rather than duplicated here.
- **What the document knows about a selection** — that a passage counts as
  touch-made only when this reader said so first, that the mark is spent on one
  change, and that a range spanning two pages is held whole. It was per-page
  state before this task, which is precisely why the page a boundary arrived on
  refused to draw its handle.
- **The drag itself**, which turned out to be exercisable after all: it is driven
  by window events and a frame loop, and jsdom raises both — so the gesture is
  played through from the grab, including the crossing, the return, the swap, the
  pointer it must ignore, and the auto-scroll under fake timers.
- **A handle reports the grab and nothing else**, and unmounting no longer ends
  anything — the regression that would silently restore the old behaviour.
- The existing reader suite passes unchanged.

## Integration

Nothing new. No table, no mutator, no route.

## Browser verification (record in status.md — primary evidence)

**Real touch, on a phone.** As with task 4, emulation arbitrates gestures
differently from glass, and this task adds a scroll that runs *during* a gesture
— the case emulation is least like.

- **A handle dragged past the bottom of a page continues onto the next**, and
  the selection covers both pages' worth of text.
- **The paper scrolls while the finger is held near the edge**, faster the
  further past it, and stops when the finger comes back inside.
- **Letting go stops the scroll immediately.**
- **The copy control copies the whole multi-page passage**, in reading order.
- **A highlight tool applied to it marks the right text on both pages.**
- **Dragging back the other way contracts the selection** rather than leaving
  the earlier page marked.
- Both themes; narrow / mid / wide.

## Coverage

Ratchet applies. The two pure pieces — point-to-page and edge-to-rate — carry
the arithmetic, and the drag loop turned out to be reachable in jsdom too, so
what is left uncovered is only what a browser has to answer: how a real finger's
events arrive, and how the paper actually moves.
