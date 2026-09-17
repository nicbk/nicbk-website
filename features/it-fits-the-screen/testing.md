# Testing: It Fits the Screen

## Unit

- **The edge rule** (task 1), as a pure function of the anchor, the menu's width
  and the viewport: a menu that fits where it hangs is not moved; one that would
  cross the right edge stops at the inset; one that would cross the left edge
  does the same; a menu wider than the screen starts at the inset rather than
  being centred on nothing. Asserted in pixels, from the widths the stylesheets
  declare.
- **The vertical rule is untouched**: the existing `menuPlacement` rows still
  pass unchanged, and the two answers are independent — a menu forced below the
  toolbar and slid in from the right gets both.
- **The row's declarations** (task 2): the square control declares a width the
  layout can see, and is still square — asserted against the stylesheet, the way
  `upload-modal.test.tsx` already asserts `aspect-ratio: 1`.
- **The citations row** (task 3): the narrow-width rule is declared only for the
  tier where the sidebar is not beside the view.

## Browser

| Check | Where |
|---|---|
| a mark near the right edge: its controls fully on screen (criterion 1) | Chrome, local, and Safari at 375px |
| a selection near the right edge, and the note editor on the same mark | Safari at 375px |
| a mark near the left edge is where it was (criterion 2) | Chrome, local |
| the collection's toolbar overruns by 0px, measured (criterion 3) | Chrome, local, at 320–1400 |
| no horizontal scroll on the collection | Safari at 375px |
| the **+** is square and row-height on both engines (criterion 4) | Chrome and Safari |
| the citations row's gaps above and below, and the desktop rule still meeting the sidebar's (criterion 5) | Chrome at 500 and 1400; Safari at 375 |
| every other floating surface at 375px — account settings, credits, article menu, upload status, the path's fold, zoom, annotation tools, the citation preview (criterion 6) | Safari at 375px |

**Measure at a real narrow viewport.** A `zoom`-emulated one reports guarded
popups as unguarded (`research.md`), so the sweep is Safari with its window
bounds set, not Chrome pretending.

Reload before every check.
