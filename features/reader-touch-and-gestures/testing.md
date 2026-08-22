# Testing: Reader Touch and Gestures

Feature-wide testing requirements. Each task's `testing.md` names what that task
must cover.

## The shape of the problem

**This is the least unit-testable feature the project has produced**, and that
has to be said plainly rather than worked around. Its entire subject is what a
hand does to a canvas: pinch distance, touch-action, pointer capture, and a
press held long enough to mean something. jsdom has no touch, no layout, no
compositor, and EmbedPDF's own gesture code lives behind a WebAssembly engine.

So the tiers carry unequal weight here, and the browser pass is not a
confirmation step — it is the primary evidence.

## Unit (Vitest + `@testing-library/react`, jsdom)

Assert **configuration and decisions**, which is what breaks quietly, and do not
pretend to assert gestures:

- The reader mounts the gesture wrapper, with both gestures enabled, around the
  document rather than beside it.
- The interaction mode registered for "no tool active" declines raw touch, and a
  tool's own mode does not — the split the whole touch model rests on.
- Whatever pure logic the long press is decomposed into (a hold predicate over
  time and movement, at minimum) is tested directly, without a DOM.
- The click that deselects does not also create: assertable at the component
  seam, since it is a decision about which handler runs.
- Existing reader tests keep passing unchanged wherever this feature is not
  meant to alter behaviour — the toolbar, the jump, the sync bridge.

## Integration

Expected: nothing new. No table, no mutator, no route. If implementation adds
one, it inherits the same ownership-refusal coverage the existing mutators have.

## Browser verification (record in each task's status.md)

Primary evidence. **A gesture feature verified only with a mouse has not been
verified**, so this tier has a hard requirement the others do not: real touch
input, or Chrome's touch emulation with `TouchEvent` dispatch — and the status
must say which was used, because emulation and glass do not always agree.

Per task, at minimum:

- **Pinch on a trackpad**: the paper zooms, the percentage in the toolbar moves
  with it, and the browser's own page zoom does not fire (chrome and sidebar
  unchanged in size).
- **Pinch on a touchscreen**: same, with two fingers, with and without a tool
  active.
- **One-finger drag**: scrolls the paper with no tool active; draws with a tool
  active; stops at the end of the reader's scroll container rather than moving
  the page behind it.
- **Long press then drag**: selects text; the copy control appears; ⌘C and
  Escape behave as #9 decided.
- **Click away from a selected mark**: the mark deselects and no new mark
  appears — checked against the database, not only against the paper, because a
  mark created off-screen is exactly the kind of thing that looks fine.
- **Both themes; narrow / mid / wide.** Regression-hunting rather than novelty:
  this feature changes input, so what to watch for is something that used to
  work and no longer does.
- **The keyboard and pointer paths still work**, since every gesture here is a
  convenience over one of them and the accessibility criterion depends on it.

## Coverage

Ratchet applies. Note the tension honestly: gesture code is hard to cover, so
the decomposition the unit tier asks for — pure predicates, separated from the
DOM handlers that call them — is what keeps the ratchet satisfiable without
writing tests that assert nothing.
