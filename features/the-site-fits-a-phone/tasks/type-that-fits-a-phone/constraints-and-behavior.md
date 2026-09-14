# Constraints and Behavior: Type That Fits a Phone

Inherits [the feature's](../../constraints-and-behavior.md). Specific to doing
it:

## Put the override beside what it overrides

Each `@media (pointer: coarse)` block goes immediately after the rule it raises,
not collected at the bottom of the file or hoisted into `globals.css`. A reader
looking at `.find`'s `font-size: var(--font-size-sm)` needs to see, without
scrolling, that a touch device gets something else and why.

The "why" is not obvious from the code and must be written: *below 16px, WebKit
zooms the page when this is focused.* Without that sentence the next person
reads a font-size bump for no reason and normalises it away.

## The value must be the token, not a number

`var(--font-size-md)`. Not `16px`, which would drift if the scale moves, and not
`1rem` spelled out, which says the same thing while bypassing the scale. The
token is exactly 1rem today and that is the point — it is the one that means
"body size".

## `clamp()` for the code, matching the existing pattern

The larger type tokens are already fluid — `--font-size-lg` is
`clamp(1.125rem, 1rem + 0.5vw, 1.25rem)`. The code rule should read the same way
so it is recognisably the same technique, with:

- a floor of `0.75rem` (12px),
- a ceiling of `0.875rem` — today's `--font-size-sm`, so desktop is unchanged,
- a middle term in `vw` that reaches the ceiling before the desktop breakpoint.

**Check the middle term rather than eyeballing it.** The floor and ceiling are
easy; what decides whether a 700px tablet gets 12px or 14px is the slope, and it
should be measured at a couple of widths rather than assumed.

## Do not introduce a new token for this

One rule needs a fluid code size. A `--font-size-code` in `typography.css` would
put a site-wide token in the scale for a single consumer, and the scale is
deliberately small. If a second consumer appears, that is when it moves.

## What must not regress

- **The document must not scroll sideways** at 375px. The block contains its
  overflow today; a font-size change cannot break that, but it is the thing to
  check rather than assume, because it is what the reader actually notices.
- **The four controls keep everything else** — their padding, borders, focus
  rings, `font: inherit` family inheritance. Only the size moves, and only under
  the query.
- **The reader's note editor is inside a floating menu** whose width is computed
  from its contents. A larger font there changes the menu's size on touch
  devices; confirm it still fits and still places itself sensibly.

## Acceptance criteria

1. All four controls resolve to `--font-size-md` under `@media (pointer: coarse)`
   and to `--font-size-sm` otherwise.
2. Each override sits beside its base rule and carries the reason.
3. `.prose pre` resolves to 12px at 375px and 14px at desktop, via `clamp()`.
4. At 375px, a code block fits 40 characters and the document does not scroll
   sideways.
5. The viewport meta is untouched.
6. The five already-16px controls are untouched.
7. No new token in `typography.css`.
8. The annotation note editor still fits and places itself correctly at a larger
   font.
