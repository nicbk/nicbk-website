# Task: Selection Across Pages

**Fifth of five**, and the second one added mid-feature. Carrying a touch
selection over a page break.

[Task 4](../touch-selection/description.md) gives a finger everything it needs to
select a passage — a long press to start one, a handle at each end to adjust it,
a magnifier to aim with — and stops each handle at the edge of its own page. This
removes that edge.

## What it does

- **A handle dragged past the end of its page continues onto the next one.** The
  range spans both; the selection rects, the copy control and the text-markup
  tools already handle multi-page ranges, because a pointer drag has been able to
  make one since #9.
- **The paper scrolls when the finger reaches the panel's edge**, at a rate that
  follows how far past the edge it is, so a selection can be extended further
  than a screen without letting go.

## Why it is a task and not a detail

Because it is the part that needs geometry the rest does not. Extending inside
one page is arithmetic over that page's own coordinates; crossing a break means
asking *which page is under the finger now*, converting into that page's
coordinates, and driving the viewport at the same time. The library answers both
— the scroll capability reports each visible page's position in viewport
coordinates through `pageVisibilityMetrics`, and the viewport capability has
`getMetrics()` and `scrollTo()` — but they are a second mechanism on top of task
4's, and one that is far harder to judge without a real device.

Split from task 4 with the user on 2026-08-23, so neither PR carries four
subsystems and no interim state feels unfinished.

## What it does not do

- **No new selection model.** The gesture, the handles and the magnifier are task
  4's and are not revisited.
- **No pointer change.** A mouse drag across a page break already works.

## Exit state

A reader on a phone presses a word near the bottom of a page, drags the end
handle downward, and the paper scrolls under their finger until the passage they
wanted — which finishes three lines into the next page — is selected.
