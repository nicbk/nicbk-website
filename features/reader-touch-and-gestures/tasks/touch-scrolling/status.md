# Status: Touch Scrolling

**State:** Not started. Second of three, and the feature's largest.

- Branch: `reader-touch-and-gestures/touch-scrolling`, from `main` after task 1
  merges.
- Sub-issue: filed at task start.
- PR: opened once the unit tier and the browser pass are both clean.

## Open items to settle before writing

- **The long press's thresholds** — how long a hold, and how much movement
  forgiven. Nothing in `research/` decides them and no other surface on this
  site has a touch-specific gesture to borrow from. They want settling in the
  browser, on a real device, rather than picked from a table; whatever is chosen
  gets recorded with its reasoning.
- **What tells the reader the hold has taken.** A gesture that changes meaning
  mid-press without feedback reads as a bug. Options are the selection simply
  appearing under the finger, a haptic tick where the platform allows it, or
  something visual; this is a design decision to make with the user if the
  obvious answer does not present itself in use.
- **Which `touch-action` value.** `pan-y` matches the reader's vertical scroll
  strategy and leaves pinch to the library; whether the horizontal axis is ever
  needed (a zoomed-in page wider than the panel) has to be checked rather than
  assumed — a paper zoomed past the panel's width that cannot be panned
  sideways would be a new defect introduced by the fix.
- **Whether re-registering `pointerMode` is the right lever, or whether a mode
  of this reader's own is cleaner.** `registerMode` is a plain `Map.set`, so
  replacing the library's default works; a distinct mode may be more honest
  about ownership. To decide against the code, not on paper.

## Log

- 2026-08-18 — Filed with the feature, spec'd at the depth the research
  supports. Not started; task 1 goes first because this one can undo it.
