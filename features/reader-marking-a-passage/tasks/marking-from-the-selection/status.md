# Status: Marking From the Selection

**State:** Not started. Second of two, and **last to merge**.

- Branch: `reader-marking-a-passage/marking-from-the-selection`, from `main`
  after task 1 merges.
- Sub-issue: [**#130**](https://github.com/nicbk/nicbk-website/issues/130).
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, close parent issue
  [#128](https://github.com/nicbk/nicbk-website/issues/128) by hand** — GitHub
  does not close a parent when its sub-issues close, and this is the last task.

## Why this task exists

Because a touch reader has no way to hold a tool and a selection at once:
picking a tool clears the selection, and a live tool takes the hold. Both guards
are correct and neither is being reversed, so the way through is to mark from
the selection itself — decided with the user on 2026-09-11, and consistent with
`reader-annotation.md`'s existing reason for putting delete beside the mark and
copy beside the selection.

## Open items to settle before writing

- **Whether `squiggly` earns its place.** Five actions is a wide control on a
  500px panel. If it does not fit, which tools belong there is a decision to
  take with the user rather than a case for letting the control overflow.
- **Icons, words, or both.** The toolbar names these tools in words; the mark's
  menu uses icons. Which vocabulary this control speaks is a design decision to
  settle against `design-system.md` and the two existing menus, at realistic
  width.
- **What "spent" looks like.** The selection is cleared once marked; whether the
  new mark is then selected — so its menu is immediately available for a comment
  — follows what the toolbar flow does, and is worth checking rather than
  assuming.

## Log

- 2026-09-11 — Filed with the feature.
