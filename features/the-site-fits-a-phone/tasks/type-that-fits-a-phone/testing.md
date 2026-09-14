# Testing: Type That Fits a Phone

Inherits [the feature's testing notes](../../testing.md).

## Unit

All stylesheet assertions, with comments stripped before matching — jsdom
resolves neither media queries nor `clamp()`.

- **No typed control is left below the threshold.** One test over all four
  stylesheets, asserting each has a `@media (pointer: coarse)` block raising its
  control to `--font-size-md`. Phrased as a statement about the *set*, because
  the property being protected is "none of them zoom", and a per-file test
  passes while a fifth control is added below 16px.
- **The query is `pointer: coarse`**, not `max-width`. A width proxy satisfies
  "there is a media query" while getting a touch laptop and a landscape phone
  wrong in opposite directions.
- **The already-safe five are untouched** — still `--font-size-md`, still with no
  coarse-pointer override.
- **`.prose pre` clamps between 0.75rem and 0.875rem.** Pins the desktop
  appearance as well as the floor.
- **The viewport meta still permits zoom** — `__root.tsx` has no `maximum-scale`
  and no `user-scalable`. This is the cheap guard on the one shortcut that must
  never be taken.

Check each by reverting its change and confirming the test fails.

## Browser, at a real 375px viewport

Reached through Safari, whose window accepts arbitrary bounds by AppleScript —
Chrome will not go below ~500px. Method and before-numbers in
[the feature's research](../../research.md).

| Check | Before | Expected |
|---|---|---|
| code font-size | 14px | **12px** |
| characters fitting | 34 | **40** |
| horizontal overflow | 214px | smaller, but still present |
| document scrolls sideways | no | still no |
| code at desktop width | 14px | **14px** |

Also worth measuring rather than assuming: **the `clamp()`'s middle term**, by
reading the computed size at two or three widths between 375px and desktop, to
see where it reaches the ceiling.

The four controls' computed sizes can be read in the same window, but note that a
desktop Safari window reports `pointer: fine` — so that check confirms the
*desktop* branch, and the coarse branch is confirmed by the stylesheet plus the
phone.

## The user's phone

The one criterion the agent cannot reach:

1. Tap the tag find field in the collection's filters. **The page should not
   zoom**, and the cursor should land in the field.
2. Open a post with code and judge whether 12px reads comfortably.

Step 2 is a judgement. 12px was chosen from character counts, and whether it is
pleasant is a question only a real screen answers — the clamp's floor is one
number if it is not.

## Not covered

**No e2e specs** — deferred project-wide.

**Whether `pointer: coarse` matches in every phone context.** It is the standard
signal, and the same kind of query this project already uses for hover, but it is
a capability report rather than a guarantee. Step 1 above is what confirms it
matched.
