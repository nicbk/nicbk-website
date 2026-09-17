# Testing: A Menu Stays on Screen

The feature's unit rows for the edge rule, in pixels, against the widths the
stylesheets declare (a mark's menu uncapped, a selection's bar at 21rem, the
note editor at `min(20rem, 60vw)`) and a 375px viewport.

Mutation checks: moving a menu that already fits; clamping to the viewport's
edge instead of the inset.

Browser: a mark near the right edge at 375px in Safari, which is where the
defect was reported, plus the sweep of every other floating surface at that
width (criterion 6). Chrome for the left-edge case, which must not move.
