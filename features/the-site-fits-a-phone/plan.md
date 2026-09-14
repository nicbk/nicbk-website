# Plan: The Site Fits a Phone

One task.

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`type-that-fits-a-phone`](./tasks/type-that-fits-a-phone/description.md) | [#169](https://github.com/nicbk/nicbk-website/issues/169) | Fields that clear the iOS threshold on touch devices; code that fits more of its line on a phone |

## Why one task and not two

The two items are independent in the code — four stylesheets for one, a single
rule for the other — and on any other feature that would argue for two tasks.

What decides it here is **who verifies**. The iOS half can only be confirmed on a
real phone, which is the user's to do; splitting the work would ask them to pick
up a phone twice for two CSS changes that together come to about six lines. The
review cost of one slightly wider PR is lower than the cost of a second round
trip through someone else's hardware.

The description says why they belong together conceptually as well: both are type
sized for a desktop and never re-decided for a phone.

## Shape of the work

**The fields.** One `@media (pointer: coarse)` block per stylesheet, raising
`.find`, `.filter` and the two note textareas to `--font-size-md`. Four files,
four rules, each beside the declaration it overrides so the pair reads together.

**The code.** One declaration in `post-page.module.css`: `.prose pre`'s
`font-size` becomes a `clamp()` bottoming out at 12px and topping out at the
current 14px, following the fluid pattern `--font-size-lg` and `--font-size-xl`
already use.

**The tests.** Stylesheet assertions, because jsdom resolves neither media
queries nor `clamp()`. What they hold is that each control has a coarse-pointer
rule naming `--font-size-md`, and that the code rule's floor is not below 12px —
the values, not the rendering, which is the browser's to confirm.

## Risks, and what makes each survivable

- **The one thing that cannot be checked here is the whole point of item 12.**
  Whether iOS actually stops zooming is a platform behaviour on hardware. The
  agent can prove the computed size clears 16px in a real 375px viewport; the
  user confirms the zoom is gone. That division was agreed before the feature was
  accepted.
- **`pointer: coarse` is a guess about the reader's device**, and a wrong guess
  is cheap in one direction (a touch laptop gets slightly larger fields) and not
  in the other (a phone that still zooms). If it turns out some phone context
  reports `fine`, the fallback is to widen the query rather than to abandon the
  approach.
- **12px may read as too small on a real screen.** It is the conservative end of
  what was offered, but the agent measured characters, not comfort. If the user
  finds it small, the clamp's floor is one number.

## Dependencies

Depends on **#4 `blog`** for the post page's prose styles and on **#8**, **#9**
and **#11** for the four controls. Nothing depends on it.
