# Constraints and Behavior: It Fits the Screen

## Behavior

- **A hand-positioned menu never crosses the screen's edge.** When it would, it
  slides back inside and stops at the same inset the guarded surfaces use,
  staying as close to its mark as it can (user-decided 2026-09-17).
- **It slides, it does not jump sides.** A menu that flipped its anchor as a
  reader marked across a line would read as unstable; the chosen rule moves it
  by the smallest amount that makes it visible.
- **Nothing else about those menus changes**: which side of the mark they sit
  on, how they dodge the toolbar, what they hold.
- **The collection does not move sideways at any width**, because nothing in it
  is wider than the column it sits in — not because an axis was clipped.
- **The upload + stays square**, at whatever height the row gives it.
- **The citations row's controls sit with the same room above and below** where
  the sidebar is not beside the view. Where it is, the row's rule still meets
  the sidebar's exactly.

## Constraints

### The edge rule

- One rule, in one place, for the three hand-positioned surfaces. They already
  share `menu-placement.ts`; the horizontal answer belongs beside the vertical
  one.
- **Measured against the viewport, not the page.** The reader's pages scroll and
  zoom inside a panel; what must stay visible is the screen.
- Re-measured when the anchor moves, on the same events the vertical rule
  already listens to (scroll in the capture phase, and the menu's own resize).
- **A menu wider than the screen is capped first, then placed** — sliding cannot
  save a surface that does not fit. The caps the surfaces already declare stay.

### The row's width

- The square controls must **contribute the width they draw** to layout, so
  their container reserves it. Fixing the contribution is the fix; the drawn
  result must not change on a desk.
- Safari draws these 0.5px wider than Chrome (recorded in
  `upload-modal.module.css`), so the fix cannot depend on a browser's rounding.
- **No clip as a safety net.** The panel's `overflow` and `overscroll-behavior`
  stay as they are (user-decided 2026-09-17).

### The citations row

- The desktop alignment is a constraint, not a preference: its rule meets the
  sidebar's at 0px today and must still.
- The narrow case is the one where the sidebar is a sheet rather than a column,
  so the rule changes only there.
- The drawer button is a touch target on the device that has it; it does not get
  smaller.

## Acceptance criteria

1. On a 375px screen, a mark near the right edge of the page opens its controls
   fully on screen, and the same for a selection's bar and the note editor.
2. A mark near the left edge is unaffected — its menu still hangs where it does
   today.
3. The collection view does not scroll horizontally at any width, and its
   toolbar's controls no longer overrun their container — checked as a number,
   not by eye.
4. The upload **+** is still square and still the height of the row beside it,
   on both engines.
5. On a phone, the citations row's controls have equal room above and below;
   on a desktop, the row's rule still meets the sidebar's exactly.
6. Every other floating surface still stays on screen at 375px — the sweep
   finds no second family of this defect.
