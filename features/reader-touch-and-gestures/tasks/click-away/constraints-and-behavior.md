# Constraints and Behavior: Click Away

The subset of [the feature's criteria](../../constraints-and-behavior.md) this
task satisfies — the whole of **"Putting a mark down"**.

## Satisfied here

- Clicking away from a selected mark deselects it and creates nothing, even with
  a tool still active. The click that deselects is spent on deselecting.
- A second click, with nothing selected, creates as it does today.
- Deleting, editing a note, and the mark's floating menu are unaffected:
  clicking a control inside that menu is not "clicking away".

## Constraints particular to this task

- **Both decisions behind the defect stay.** The sticky tool
  (`deactivateToolAfterCreate: false`) and the engine's click-to-create are
  wanted behaviours; this task removes only what they produce together on one
  specific click. A fix that turns either off is the wrong fix, however much
  smaller its diff.
- **Only the first click is swallowed.** Deselecting must not put the reader
  into a state where the tool has quietly stopped working — the very next click
  creates normally, and nothing about the tool's own state changes.
- **A drag is not a click.** Pressing on blank paper with a mark selected and
  dragging out a new shape is unambiguous and must still create; only the
  click-to-place path is affected.
- **The existing deselect-on-blank-paper behaviour is the seam**, not a second
  mechanism beside it: `pdf-reader.tsx` already deselects on `pointerdown` over
  bare paper, and `blank-paper.ts` already decides what "bare paper" means. This
  task extends that decision rather than introducing a competing one.
- **Clicking a mark while another is selected still selects the new mark.**
  That is not clicking away; swallowing it would make selecting a second mark
  take two clicks.

## Cross-cutting

- WCAG 2.2 AA: Escape already drops a selection and continues to; this adds a
  pointer path to the same outcome, not a replacement for the keyboard one.
- Both themes; narrow, mid and wide. Behavioural rather than visual, so the risk
  is a regression in the reader's pointer handling rather than a layout fault.
- No stored data, no schema change, no new mutator — though the *absence* of a
  stray row is exactly what verification should check, since a mark created
  off-screen looks like nothing at all.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
