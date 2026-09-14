# Testing: One Row, Two Item Sets

Inherits [the feature's testing notes](../../testing.md). Specifics:

## New unit tests — `header-row.test.tsx`

- Renders a `<header>` landmark containing its children, in order.
- Applies the `className` it is given alongside its own row class.
- **The stylesheet declares `min-height`, not `height`** — read with
  `readFileSync`, comments stripped first (`collection-toolbar.test.tsx`'s
  lesson: a comment naming a property matched the assertion looking for it).
- **The stylesheet declares no `position`** — the row does not place itself.

## New unit tests — the pair that holds the feature

In `header-row.test.tsx`, asserting across all three stylesheets:

- **Neither header's stylesheet declares `min-height`, `height`,
  `padding-block`/`padding` shorthand, `font-size` or `border-bottom`.** This is
  the test that fails when someone adjusts one header's padding, which is exactly
  how the 1px arrived.
- **The site header's stylesheet still declares `position: sticky`, `top: 0` and
  `z-index: 1`**, and the tracker's declares no `position` at all.

Both are stylesheet assertions, and both are honest about it: they prove the two
rows take their height from the same declaration. That the resulting pixels match
is the browser's to confirm.

## Existing tests

`site-header.test.tsx` and `lit-tracker-header.test.tsx` are the regression suite
for "the items did not move" and **must pass unedited**. If one needs changing,
the refactor has changed behaviour it was not supposed to.

## Browser verification

Run against the local Compose stack, then Safari. Record numbers, not
impressions.

1. **Measure every route** — `/`, `/blog`, `/about`, `/projects`, `/lit-tracker`
   — at one desktop width. All equal, and equal to 56px.
2. **Measure the pair at phone width** (≤500px). Still equal.
3. **Scroll `/blog` and a blog post.** The header stays at `top: 0`; content
   passes beneath it, not over it.
4. **Scroll the tracker.** The document still gains no scrollbar; the panels
   scroll inside the shell.
5. **320px.** Neither header wraps; the tracker's app name truncates before the
   toggle is pushed off.
6. **Both themes**, on both surfaces.
7. **Safari, same measurements.** The site header's fractional height should be
   gone, so both engines should report the same integer. If they do not, that is
   the finding and the task is not done.

The before-numbers to compare against are in
[the feature's research](../../research.md).
