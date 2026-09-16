# Constraints and Behavior: The Preview Knows the Paper

The feature's Matching constraints, plus:

- **A pure module**, taking the region and the edges and returning one edge or
  none. No React, no engine.
- **Page first, then overlap.** A region on another page is not a candidate
  whatever its rectangle.
- **Two candidates mean none**, and the reason is in the code: opening the wrong
  paper is worse than offering nothing.
- The preview passes the answer down but shows nothing yet, so this task is
  reviewable without a visual change.

## Acceptance

The unit rows below; feature criterion 3 in part (a non-reference link matches
nothing).
