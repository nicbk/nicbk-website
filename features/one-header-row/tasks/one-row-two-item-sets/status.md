# Status: One Row, Two Item Sets

**State:** Not started. Task 1 of 1.

- Branch: `one-header-row/one-row-two-item-sets`, from `main` with the feature
  spec merged.
- Sub-issue: [**#157**](https://github.com/nicbk/nicbk-website/issues/157).
- PR: **TBD**.
- **On merge this completes #17** — check the parent issue
  [#156](https://github.com/nicbk/nicbk-website/issues/156) and close it by hand
  if it has not closed itself, which on the last three features it has not.

## Why this task exists

The site's header measures 58.59px and the tracker's 57.00px, and the difference
is visible to the user. Neither number is declared anywhere: both are sums of a
padding chosen in one file and whatever the tallest item in that row happens to
be. The fix is not to make the two sums equal — it is to stop having two.

## What to do first

Read [the feature's research](../../research.md) for the before-numbers, then
re-measure them, because they are what "done" is compared against and this task
is being built specifically for a user who can see a pixel.

## Log

- 2026-09-13 — Spec'd.
