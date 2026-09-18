# Status: The Citations Row Breathes

**State:** **Complete** ([#232](https://github.com/nicbk/nicbk-website/issues/232),
PR [#236](https://github.com/nicbk/nicbk-website/pull/236), merged 2026-09-17).

## What shipped

Below **768px** — the breakpoint the sidebar itself disappears at — two
declarations:

- the view's pull-up becomes a full cancel of the panel's inset, so the row
  starts at the header rather than 16px below it;
- **the tabs' vertical padding grows by `--space-sm`**, so the row is as tall as
  the space it absorbed.

The desktop is untouched.

## The regression this went through, and why it matters

The first attempt put a `min-height` on the row. The numbers for the controls
looked right — 8.3px above, 9.3 below — and it was **wrong**: `.tabs` is
`align-self: stretch` so that a selected tab's underline lands on the rule, and
a stretched tab holds its text at its own top. The row grew, the controls
centred themselves in it, and the words *cites* and *cited by* stayed up by the
header. **The user saw it; I had measured one child of the row and not the
other.**

Growing the row from the tabs' own padding keeps both things true at once: the
text sits between equal amounts of space, and the underline is still the tab's
bottom edge, which is still the rule.

A second thing that bit: the first version of this rule sat near the top of the
stylesheet, and `.tab`'s base `padding` shorthand comes later in the file — at
equal specificity the later rule won and the override did nothing. It is at the
end of the file now.

## Verified

| | before | after (500px) | desktop (1400px) |
|---|---|---|---|
| row height | 27.5 | 43.5 | 27.5, unchanged |
| the rule | 99.5 | **99.5** | 99.5 |
| controls above / below | 16 / 1.1 | **8 / 9.1** | 16 / 1.1, unchanged |
| tab text vs controls, centre | — | **0.5px apart** | 0.5px apart |
| underline on the rule | yes | **yes** | yes |
| the rule vs the sidebar's | 0 | — | **0**, unchanged |

The 9.1 and the 1.1 include the rule's own 1.1px border; measured to the
content edge the controls have 8 above and 8 below.

**Safari at a real 375px**: row 43, rule 99, controls 7.8 above and 8.8 below,
underline on the rule, text and controls 0.5px apart — the same answer the other
engine gives.

- **Unit**: the narrow tier is declared, it cancels the inset, it grows the row
  through the **tab's** padding, and it declares no `min-height`. Reinstating
  the `min-height` approach fails that row, so the regression cannot come back
  quietly.

## Log

- 2026-09-17 — Spec'd.
- 2026-09-17 — Merged in #236.
- 2026-09-17 — Implemented. First attempt regressed the tab text's alignment,
  reported by the user and fixed by growing the row from the tabs rather than
  from the row.
