# Task: Pressable Things Look Pressable

Task 1 of 2 of [controls-look-like-controls](../../description.md) (#18).

## What it does

Raises the shared tag toggle's resting colour to `--color-text`, so the words a
reader can press are darker than the words that label them.

Today they are the same word, visually: `rgb(89, 89, 89)`, 14px, weight 400, on
both the tracker's filter rail and the blog's tag filter. The heading cannot be
made quieter — `--color-text-muted` is the 4.5:1 floor and `contrast.test.ts`
holds it — so the control is what moves.

## What changes

**`tag-toggle.module.css`** — `.toggle`'s resting `color` becomes
`var(--color-text)`.

**Whatever the other states need** to stay distinct from it. The pressed state is
`--color-accent` plus bold, and hover is `--color-accent`; with resting now
darker, both need looking at rather than assuming. The bold is not optional —
it is the WCAG 1.4.1 half of the pressed state and it becomes the load-bearing
half here.

**Nothing about the headings.** `.groupLabel` and the blog's `.heading` stay
exactly as they are. They were always right; they simply had nothing to contrast
with.

## What it does not change

- The tracker's tags stay plain — no `#`. That is decided, and it is the reason
  this defect shows there and not on the blog.
- No variant, no prop, no per-caller exception. `TagToggle` exists so the two
  surfaces cannot drift; a caller needing an exception would mean the remedy is
  wrong.
- Selection behaviour, keyboard operation, the ellipsis on long tag names, the
  24×24 target sizes in the rail — all untouched.

## The surface this also changes

**The blog's tag filter.** Its tags get darker. The user decided this knowingly
(2026-09-13): `tag-filter.module.css`'s `.heading` is a byte-for-byte duplicate
of the tracker's `.groupLabel` over the same toggle, so the blog has the same
collision and is only saved by the `#` its tags carry. Fixing one surface and not
the other would leave the shared component carrying two different intentions.
