# Status: Click Away

**State:** Not started. Third of three.

- Branch: `reader-touch-and-gestures/click-away`, from `main` after task 2
  merges.
- Sub-issue: filed at task start.
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, close this feature's parent issue by hand** — GitHub does not
  close a parent when its sub-issues close, and this is the last of three.

## Open items to settle during implementation

- **Where the click is swallowed.** The reader already deselects on
  `pointerdown` over bare paper; whether stopping the engine's creation is a
  matter of ordering, of `stopPropagation`, or of asking the annotation scope
  what is selected before letting the event through, depends on how EmbedPDF
  dispatches to a tool's pointer handler relative to the page's own props. To
  be settled against the code — the answer is observable, not a judgement call.
- **Whether "a drag is not a click" needs its own handling** or falls out of the
  engine's existing click detector (`useClickDetector`, threshold 5px). Likely
  the latter, which would mean the guard belongs on the click path only.

## Log

- 2026-08-18 — Filed with the feature. Independent of the two touch tasks, so
  it is last by size rather than by dependency and could move if the touch work
  needs splitting.
