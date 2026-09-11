# Constraints and Behavior: Ending a Selection

The repair half of
[the feature's criteria](../../constraints-and-behavior.md).

## Satisfied here

- **A drag released over another page ends the selection.** The copy control
  appears for it, and a live markup tool marks every page the passage covers —
  one mark per page.
- **A programmatically applied selection counts as finished** the moment it is
  applied, so the same is true of every touch selection.
- **Finishing happens once.** Not once per page the selection covers, not again
  when the next pointer goes down somewhere unrelated, and not at all for a
  selection the library finished itself.
- **A selection the library *did* finish is left entirely alone** — the common
  case, and the one that must not acquire a second code path.

## Must not regress

- **The copy control and ⌘C**, including a PDF that withholds permission to
  extract its text.
- **Single-page marking with a live tool**, which works today and travels the
  library's own path.
- **Everything #12 shipped**: the hold, the handles, the magnifier, cross-page
  extension and its auto-scroll, pinch, touch scrolling, click-away, Escape.
- **`annotation-sync/`'s loop guard** — marks made here arrive as ordinary
  committed create events and are written once.
- **Touch selections must not acquire handles they should not have**, nor lose
  the ones they should: re-applying a range must not change this reader's own
  record of whether a finger made it.

## Constraints particular to this task

- **The question is asked of the library, not inferred from the gesture.**
  `getState(documentId).selecting` is public; "the pointer went up over a
  different page than it went down on" is a guess about a mechanism that may
  change.
- **The re-apply's echo must settle.** Calling `setSelection` with the range
  already selected raises a selection-change event this reader listens to;
  it must be recognised rather than treated as a new selection, and it must not
  loop. This is the same shape `annotation-sync/` solves for marks, and the
  likeliest place for this task to go wrong.
- **The markup commit takes its shape from the live tool's own `defaults`**,
  read from the annotation capability — never from constants copied out of the
  library — so the duplicated twenty lines cannot drift on colour, opacity or
  flags.
- **Decompose so the decision is testable without a DOM.** "Does this selection
  need finishing?" and "what does committing this produce?" are both pure
  functions over what the plugin reports.
- **Every compensation names what it compensates for**, with the library
  behaviour and its location, so a later reader can tell a workaround from a
  design.

## Cross-cutting

- WCAG 2.2 AA: nothing here becomes the only way to do anything; the copy
  control's own semantics are #9's and unchanged.
- Both themes; narrow, mid and wide.
- No stored data, no schema change, no new mutator.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
