# Plan: Controls Look Like Controls

Two tasks. The affordance fix goes first because it is the one that costs a
reader something — they cannot tell what is pressable — while the other three are
controls that work and look unfinished.

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`pressable-things-look-pressable`](./tasks/pressable-things-look-pressable/description.md) | [#162](https://github.com/nicbk/nicbk-website/issues/162) | The shared toggle rises to full contrast; labels stay muted; the pressed state stays distinguishable |
| 2 | [`the-upload-controls-look-finished`](./tasks/the-upload-controls-look-finished/description.md) | [#163](https://github.com/nicbk/nicbk-website/issues/163) | A square "+", a drawn file field, an integer-boxed spinner |

## Why this split

**Task 1 is one change to one shared component**, and its risk is entirely in
what the change does to *other* states — the pressed toggle, the hover, the
contrast floor, the axe scans on two surfaces. That is a coherent thing to review
on its own.

**Task 2 is three changes to one cluster.** The "+", the modal it opens, and the
status indicator beside it are the same surface, and all three are "this control
is not finished". Splitting them into three tasks would be three PRs for what a
reviewer reads in one sitting; merging them into task 1 would mix an affordance
decision with cosmetics.

## Shape of the work

**Task 1** — one declaration in `tag-toggle.module.css`, plus whatever the
pressed/hover states need to stay distinct from the new resting colour, plus
tests that pin the relationship rather than the hex values. Both surfaces get
looked at: the tracker's rail *and* the blog's filter.

**Task 2** —

- the `.trigger` sizes itself square rather than inheriting the row's height;
- `.picker` gains a dotted boundary and the padding to make it read as a target,
  without replacing the native input;
- the icon rule's `1.15em` becomes a value that lands on whole pixels at the
  surfaces it is used on.

## Risks, and what makes each survivable

- **The pressed state narrowing.** Raising the resting colour moves it towards
  the accent. This is the one thing in task 1 that could make the rail *worse*,
  and it needs looking at in both themes rather than reasoning about.
- **Reaching into the blog.** Task 1 changes a page the user did not report a
  problem with. They chose that knowingly, and the blog's own heading/toggle pair
  is the same defect one `#` away from showing.
- **`stretch` is load-bearing.** Task 2's "+" must not reintroduce the ragged row
  that `align-items: stretch` was added to fix.
- **The spinner may not be fixed by this.** Stated in the constraints and to be
  stated in the PR: one measured candidate is removed, and the user judges.

## Dependencies

Depends on **#8 `collection-view`** for the rail and toolbar, **#4 `blog`** for
the other consumer of the shared toggle, and **#7** for the upload modal and
status indicator. Nothing depends on it.
