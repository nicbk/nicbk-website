# Constraints and Behavior: Toolbar Above the Collection

The first half of [the feature's criteria](../../constraints-and-behavior.md).

## Satisfied here

- The toolbar receives a hit at every probe point over it, scrolled, at a wide
  and a narrow width, in **Chrome and Safari**.
- A card menu overlapping the toolbar receives the probe in the overlap region.
- With the upload modal open, a point over the toolbar receives the **backdrop**.
- The order is declared in the stylesheet and asserted by a test.
- AGENTS.md's browser-verification section names engine-sensitive behaviour.

## Must not regress

- The row's transparency, its sticky offset, and its `align-items: stretch` row
  height — all decided and separately reasoned.
- Any portalled surface, anywhere. The filter drawer, the article menu, the
  upload modal, the edit and delete dialogs, the toast region.
- The focus-ring room inside the row's controls (no new overflow).

## Constraints particular to this task

- **`isolation: isolate` and the `z-index` are one change, not two.** Either
  alone is a defect: the z-index alone lifts the row above portals; the
  isolation alone changes nothing. The test asserts **both**, so removing one
  fails rather than silently restoring a production bug.
- **The comment must state the relationship, not the values.** What the row
  beats, what beats it, and why the isolation is what makes the second true. The
  comment being replaced was confident and wrong; a replacement that merely
  records different values would age the same way.
- **No `z-index` may be added to anything else** to make this work. If the row
  needs a neighbour raised, the approach is wrong.
- **Verification is by hit-test with the overlap asserted first.** A screenshot
  cannot tell "on top" from "not overlapping yet", and a probe that lands
  outside the overlap must not be able to pass.

## Cross-cutting

- The **AGENTS.md edit is written as a principle**, not as "remember Safari for
  layering" — that document's own rule about fixing recurring mistakes at the
  level of the principle. The durable statement is that behaviour left to engine
  defaults is verified in more than one engine.
- The last check runs on **`nicbk.com` in Safari**, because that is where it was
  reported and where the user reads. Local is necessary and not sufficient.
- WCAG 2.2 AA unaffected: no change to focus order, names, or contrast.
- CI green: Biome, typecheck, unit + integration with ratchet coverage, PR-title
  lint.
