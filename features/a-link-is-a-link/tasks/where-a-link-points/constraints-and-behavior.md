# Constraints and Behavior: Where a Link Points

- **Synthetic fixtures only**, shaped from research §4–5: a numbered
  single-column reference page, a two-column author–year page, a publisher page
  whose targets are five entries high, a table target.
- **Snap only when the label starts a run.** Body text containing `[13]` must not
  snap.
- **Page coordinates** as the engine reports runs (top-left origin, points). The
  conversion from XYZ/FitRectangle's bottom-left origin is done once, tested.
- **Every rule has a test that fails without it.**

## Acceptance

Feature criterion 4.
