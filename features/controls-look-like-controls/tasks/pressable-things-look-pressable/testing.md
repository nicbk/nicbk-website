# Testing: Pressable Things Look Pressable

Inherits [the feature's testing notes](../../testing.md).

## Unit

- **The relationship, across all three stylesheets.** One test reading
  `tag-toggle.module.css`, `filter-groups.module.css` and
  `tag-filter.module.css`, asserting the toggle resolves to `--color-text` while
  both headings resolve to `--color-text-muted`. Asserting the *relationship*
  rather than the hex is the point: it fails whichever of the three somebody
  edits. Strip comments before matching.
- **The pressed state keeps both signals** — `--color-accent` and a bold weight
  in the same rule. A test that only checked colour would pass a change that
  dropped the weight, which is the WCAG 1.4.1 regression.
- **Hover is still inside `@media (hover: hover)`.**
- Existing tests for `TagToggle`, `filter-groups`, `filters-drawer` and the
  blog's `tag-filter` pass **unedited**.

Check the new tests by reverting the one-line change and confirming they fail.

## Browser

Both themes, both surfaces, with the rail seeded with enough tags that the list
looks like a real collection rather than two rows.

| Check | How |
|---|---|
| the rail's hierarchy | computed colour of the `<h2>` vs a resting toggle — different, with the toggle darker in light theme |
| the selected state | select a tag: accent + bold, and visibly not a resting toggle |
| hover | on a pointer device, a resting toggle takes the accent; nothing is latched afterwards |
| **dark theme** | both of the above again — the accent/text pair differs there |
| **the blog** | `/blog`: the same heading-vs-toggle check, and that `#name` still reads correctly at the new weight |
| the drawer | at phone width, the rail's sheet shows the same hierarchy |

Reload fully between checks rather than relying on HMR.

## What would say this went wrong

A selected tag that no longer jumps out of the list. If raising the resting
colour has made "selected" hard to spot, the remedy has traded one affordance
problem for another and the answer is a stronger pressed state, not a quieter
resting one — the label's floor is what started this.
