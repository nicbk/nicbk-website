# Constraints and Behavior: The Reader Returns to It

The feature's "Restored" and "Saved" constraints, plus:

- **Read the saved position once**, when the reader mounts, from the article
  row already loaded for the detail page. Later sync deliveries of the same
  columns are not read.
- **The hook is testable without an engine**: scroll events and the mutation are
  injected.
- **Reload before every browser check** (HMR keeps old handlers), and record the
  offset read back numerically, not by eye.

## Acceptance

Feature criteria 2–8.
