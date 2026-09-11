# Constraints and Behavior: Marking From the Selection

The design half of [the feature's criteria](../../constraints-and-behavior.md).

## Satisfied here

- **The floating control offers the four text tools beside `copy`**, and each
  marks the selected passage with that tool.
- **A passage spanning pages gets one mark per page**, each covering that page's
  part — the shape the library's own markup produces.
- **The mark is indistinguishable from a toolbar-made one** afterwards: same
  row, same sidebar entry (quoting the passage), same floating menu with delete
  and the comment editor, and it survives a reload.
- **The selection is spent.** After marking, the passage is no longer selected —
  the reader has turned it into a mark, and leaving both up would leave two
  things apparently selected at once.
- **A document that withholds permission to modify annotations offers no
  markup actions**, the way a document that withholds text extraction already
  disables `copy`.

## Must not regress

- **`copy` stays first and stays obvious.** It is the action this control was
  built for, and the one a reader reaches for most.
- **The toolbar's tools and the sticky-tool flow**, unchanged.
- **The mark's own floating menu** — a different control over a different thing.
- Everything task 1 delivers, and everything #12 and #9 shipped.

## Constraints particular to this task

- **One control, not two.** The actions live on the control that exists, rather
  than a second surface that would have to be placed, themed and dismissed.
- **It must not cover what it acts on.** It floats near the selection; at 500px
  with a passage spanning two lines it has to be readable without hiding the
  passage, which is the case the browser pass judges.
- **Named for what they do, not for their shape** — the labels follow the
  toolbar's own names for the same tools, so a reader meets one vocabulary.
- **Keyboard-reachable and touch-sized**: every action in the tab order with an
  accessible name, and a target no smaller than `copy`'s.
- **The commit path is task 1's**, not a second one written here.

## Cross-cutting

- WCAG 2.2 AA: contrast in both themes, targets at least 24×24 (the reader's
  house size is 44×44), and no action reachable only by pointer.
- Both themes; narrow (500px), mid and wide, with a realistic passage.
- No schema change, no new mutator, no new route.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
