# Testing: Gestures

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest + `@testing-library/react`, jsdom)

The gesture itself is untestable here — jsdom has no touch and no compositor —
so what is asserted is **the composition**, which is exactly what would break
quietly:

- The reader renders the gesture wrapper, and renders the document's pages
  *inside* it rather than as a sibling. A wrapper mounted in the wrong place
  fails silently at runtime and looks correct in a diff.
- It is given the reader's `documentId` — the article id, per the reader's
  keying convention. A wrapper scoped to the wrong document zooms nothing.
- Both `enablePinch` and `enableWheel` are passed as `true`, so a future
  package default cannot remove a feature without a test failing.
- The existing reader suite still passes untouched: the toolbar's zoom controls,
  the page field, the jump, the Escape handler. This task adds an element to the
  tree those tests render through.

## Integration

Nothing new. No table, no mutator, no route.

## Browser verification (record in status.md — primary evidence)

**Must include a real trackpad and real or emulated touch**, and the status must
say which was used.

- **Trackpad pinch, both directions**: the paper's rendered size changes and the
  toolbar percentage tracks it.
- **The page itself does not zoom**: the header, the sidebar rail and the
  toolbar are unchanged in size after pinching — checked deliberately, since
  this is the failure being fixed and it is easy to mistake a zoomed page for a
  zoomed document.
- **Touchscreen two-finger pinch** zooms the paper, with a tool active and with
  none.
- **The controls and the gesture agree**: pinch to some zoom, then press `+` —
  it steps from where the gesture left off, not from where the control last was.
- **Zoom-to-point**: pinching over a figure keeps that figure under the fingers,
  rather than zooming about the top-left of the viewport.
- Both themes; narrow / mid / wide, watching for the document shifting or the
  toolbar overlapping — the risks of adding a wrapper element, as distinct from
  the gesture's own risks.

## Coverage

Ratchet applies. This task is mostly composition, so its own coverage
contribution is small; if the ratchet tightens, the honest remedy is testing the
composition more thoroughly rather than manufacturing tests for library code.
