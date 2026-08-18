# Constraints and Behavior: Gestures

The subset of [the feature's criteria](../../constraints-and-behavior.md) this
task satisfies — the whole of **"Zooming by gesture"**, and none of the rest.

## Satisfied here

- A trackpad pinch zooms the paper, not the page: after pinching over the
  document, the chrome, the sidebar and the toolbar are the size they were.
- A two-finger pinch on a touchscreen zooms the paper, with a tool active or
  none.
- The toolbar keeps telling the truth: a gesture-driven zoom moves the same
  state the `+`/`−` controls and the percentage read from.
- Zoom by gesture is centred on the gesture as far as the engine's own
  zoom-to-point allows.

## Explicitly left to later tasks

- **One-finger touch still selects text and does not scroll.** Unchanged by this
  task and not a defect in it; task 2 owns the touch model.
- **Clicking away from a mark still creates one.** Task 3.

## Constraints particular to this task

- **The wrapper goes inside the viewport, around the scrolled content.** It
  needs the viewport container from context to attach its listeners and to
  compute the point under the fingers; mounted outside it, the gestures either
  do not fire or zoom about the wrong origin.
- **Both flags are passed explicitly** even though both default to `true`. A
  default that is the entire purpose of a component should not be invisible in
  the code that depends on it, and a future version changing its default must
  not silently remove a feature.
- **The browser's page zoom must be prevented, not merely unused.** ctrl/cmd +
  wheel has a browser default; if the wrapper's interception does not hold in
  practice, that is a finding to raise rather than to paper over with a second
  listener.
- No new dependency: `@embedpdf/plugin-zoom` is already installed and pinned at
  2.15.0.

## Cross-cutting

- WCAG 2.2 AA: the gesture is a convenience over the toolbar's zoom controls,
  which remain the reachable path and are unchanged.
- Both themes; narrow, mid and wide. Regression-hunting — this task adds a
  wrapper element to the reader's tree, and an element that lays out wrongly
  would show up as the document shifting rather than as a broken gesture.
- No stored data, no schema change, no new mutator.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
