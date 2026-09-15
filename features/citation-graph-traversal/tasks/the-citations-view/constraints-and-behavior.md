# Constraints and Behavior: The Citations View

The feature's **The Citations tab** and **The citations view** behavior, plus:

- **The reader is hidden with the `hidden` attribute**, not unmounted and not
  moved off-screen, so it takes no focus and no pointer. The reading-position
  save must not write while it is hidden.
- **Opening an in-collection item** drops `view` and resets the sidebar to its
  default tab. Task 4 adds `via`; until then it is a plain navigation.
- **Layout follows the design system**: monospace, the site's list and tab
  styles, and container queries for the narrow panel
  (research/ui-ux/design-system.md). Checked at desktop and phone widths, in both
  themes.
- **No new dependency.**

## Acceptance

Feature criteria 1–5.
