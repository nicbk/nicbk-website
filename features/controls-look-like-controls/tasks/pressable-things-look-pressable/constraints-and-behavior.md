# Constraints and Behavior: Pressable Things Look Pressable

Inherits [the feature's](../../constraints-and-behavior.md). Specific to doing
it:

## The three states must stay three states

Before this change the toggle had a comfortable gap between resting (muted) and
pressed (accent + bold). Raising resting to `--color-text` closes part of that
gap, and the remaining separation has to be checked rather than assumed:

- **resting vs pressed** — `--color-text` vs `--color-accent` + bold. The bold is
  what guarantees WCAG 1.4.1 if the two colours read similarly to someone who
  does not perceive the hue difference. It stays.
- **resting vs hover** — hover is `--color-accent`, gated on
  `@media (hover: hover)` because a touch device latches `:hover` and never
  releases it. That gate stays; a latched hover that now reads as "pressed minus
  the bold" is the exact bug the gate was added for.
- **heading vs resting** — the point of the task. Muted against text.

**Check both themes.** The accent and the text token are different pairs in dark,
and "distinct in light" is not evidence about dark.

## Do not move the heading

It is tempting to also nudge `.groupLabel` — smaller, letter-spaced, a rule
beneath. Don't, in this task. The measurement says one change produces the
contrast, and stacking a second makes it impossible to tell which did the work if
the result is wrong.

## The duplicated heading rule

`.groupLabel` (tracker) and `.heading` (blog) are byte-for-byte identical and
serve the same role. That is the drift hazard #17 was about, and extracting a
shared rule is tempting **and out of scope here**: this task changes the toggle,
and a refactor of the labels on top would make the diff about two things. Note it
for later rather than doing it.

## Acceptance criteria

1. `.toggle`'s resting colour is `var(--color-text)`; `.groupLabel` and the
   blog's `.heading` are unchanged and still `var(--color-text-muted)`.
2. A pressed toggle is still accent-coloured **and** bold.
3. Hover is still gated on `@media (hover: hover)`.
4. Contrast tests and both axe scans pass.
5. In the browser, on the tracker rail **and** the blog filter, in **both
   themes**: the heading is visibly quieter than the toggles, and a selected
   toggle is visibly distinct from a resting one.
6. Every existing test for the toggle, the filter rail, the filter drawer and the
   blog's tag filter passes unedited.
