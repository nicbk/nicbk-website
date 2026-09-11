# Task: Ending a Selection

**First of two.** Giving this reader its own notion of a selection being
finished, and acting on it when the library has not.

## What it does

- **Notices when the library left a selection unfinished** — a drag released
  over a page other than the one it began on, or any selection this reader
  applied programmatically, which is every touch selection since #12's task 4.
- **Finishes it**: re-applies the range through the public `setSelection`, which
  clears the plugin's stuck `selecting` flag and, with it, restores the floating
  control that was suppressed while the flag was set.
- **Commits the live markup tool** for a selection the library will not commit
  itself, so a text tool dragged across a page break marks both pages as it
  marks one.

## What it does not do

- **No new UI.** The floating control gains nothing here; that is task 2. What
  changes is that it *appears* for a selection that spans pages.
- **No new pointer listeners.** It is fed by the machinery `touch-selection/`
  already owns. #12 spent three tasks learning what a competing listener costs,
  and `AGENTS.md` now carries the rule.
- **No change to how selections are made.** The hold, the handles, the drag and
  the auto-scroll are #12's.

## Why it is a task of its own

Because it is a repair, judged against measurements that already exist, and
because task 2's control is placed by the very machinery this unsticks: a
cross-page selection shows **no** floating control today, so building new
actions on it first would build them where they cannot be reached.

## Exit state

A reader drags a highlight across a page break and gets a highlight on both
pages. A reader who selects a passage spanning two pages sees the copy control
they see for any other selection.
