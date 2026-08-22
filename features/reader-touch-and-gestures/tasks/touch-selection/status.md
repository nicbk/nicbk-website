# Status: Touch Selection

**State:** Not started. Fourth of four, and added mid-feature.

- Branch: `reader-touch-and-gestures/touch-selection`, from `main` after task 3
  merges.
- Sub-issue: [**#112**](https://github.com/nicbk/nicbk-website/issues/112).
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, close this feature's parent issue #108 by hand** — GitHub does not
  close a parent when its sub-issues close, and this is now the last of four.
  (This duty moved here from task 3 when this task was added.)

## Why this task exists

Task 2 was spec'd to carry the whole touch model and could not: "long press,
then drag to select" requires reclaiming a gesture the browser has already been
allowed to pan, and no API does that. The model was re-decided with the user —
**long press selects the word, handles extend it** — and the work it implies
moved here. The full finding is in
[reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
2026-08-22 revision.

**It also carries a gap that is open until it ships.** After task 2 a touch user
can scroll, zoom and annotate but cannot select a passage — so #9's copy control
and the four text-markup tools are unreachable by touch alone. Accepted
deliberately with the user rather than holding reading on a phone hostage to it,
and stated here so the cost is visible while it stands.

## Open items to settle before writing

- **The hold's thresholds** — how long, and how much movement forgiven. To be
  settled on a real device; the slow drag that nearly holds is the case that
  decides whether the number is right.
- **What a handle looks like**, and how large its hit target is beyond its
  graphic. Nothing on this site has one; the decided minimum touch target is the
  floor, not the answer.
- **Whether the hold needs feedback beyond the selection appearing.** Judged in
  use — a haptic tick is available on some platforms and may be unnecessary.
- **How the browser's native long-press UI is suppressed** without also
  suppressing something wanted. `-webkit-touch-callout`, `user-select` and the
  context-menu event are the levers; which are needed is an implementation
  finding.

## Log

- 2026-08-22 — Filed mid-feature, when task 2's implementation proved the
  decided touch model unbuildable and the user chose to split rather than hold
  the reported scrolling fix behind it.
