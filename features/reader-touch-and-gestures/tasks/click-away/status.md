# Status: Click Away

**State:** In progress. Third of four.

- Branch: `reader-touch-and-gestures/click-away`, from `main` at `ee54340`
  (task 2's merge).
- Sub-issue: [**#114**](https://github.com/nicbk/nicbk-website/issues/114).
- PR: opened once the unit tier and the browser pass are both clean.
- ~~On merge, close this feature's parent issue by hand.~~ **That duty moved to
  [`touch-selection`](../touch-selection/status.md)** when task 4 was added
  mid-feature; this is no longer the last task.

## Open items, as settled

- **Where the click is swallowed: at its *end*, from an always-registered
  pointer handler.** Settled against the code, as the spec asked, and both
  halves of that answer are load-bearing:
  - *An always-registered handler*, because the interaction manager merges a
    page's handlers and walks the always-group **before** the active mode's,
    checking `isImmediatePropagationStopped()` between each. A handler
    registered against a `modeId` would land in the second group — after the
    tool — where stopping propagation achieves nothing. The reader's existing
    `onPointerDown` prop could not have done it either: a React prop is
    delegated at the root, so it runs after the engine's own listener on the
    element.
  - *At the end*, because creating on a bare click happens on pointer **up**,
    through the engine's click detector, and only if the pointer stayed put.
    Stopping the press at its start would be simpler and would break the
    criterion that a drag still creates.
- **"A drag is not a click" needed its own handling after all.** The guess in
  the spec was that the engine's click detector would cover it; it does, but
  only *inside* the tool handler being pre-empted — by the time this decides
  whether to stop the press, the detector has not run and cannot be consulted.
  So the distance is measured here too, against the same 5px the engine uses,
  and a test pins the two together because a disagreement would recreate the
  defect in a narrow band of distances.

## Browser verification

Recorded here because both Playwright tiers are suspended. Exercised against
the Compose app, counting rows in the database at every step rather than
trusting the paper — a stray 100×100 mark can land under the toolbar, off the
visible page, or exactly on top of another.

**Confirmed** — the reported sequence, at 1300px:

| step | rows | |
|---|---|---|
| start | 17 | |
| drag out a rectangle | **18** | a drag still creates |
| click away from it | **18** | **the fix** — deselects, creates nothing |
| click again | **19** | the sticky tool is intact; only one press was withheld |
| click a *different* mark while one is selected | 19 | selects it, and is not swallowed |

- **Escape still deselects** and still puts the tool down, unchanged.
- **Repeated at 420px in light theme**: click to place (17 → 18), then click
  away (18 → 18). Same behaviour, so the guard is not width- or theme-
  sensitive — as expected for a behavioural change, checked because the spec
  asks rather than because it was in doubt.
- Test marks removed afterwards; the article is back to the 17 rows it started
  with.

## Log

- 2026-08-18 — Filed with the feature. Independent of the two touch tasks, so
  it is last by size rather than by dependency and could move if the touch work
  needs splitting.
- 2026-08-23 — Implemented and browser-verified (above). No defect found. The
  close-#108 duty moved to task 4, which is now the feature's last.
