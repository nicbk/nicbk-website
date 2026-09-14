# Constraints and Behavior: One Row, Two Item Sets

Inherits every constraint in
[the feature's](../../constraints-and-behavior.md). What follows is specific to
carrying them out.

## The component's interface

It takes **children** (the items) and **`className`** (the caller's positioning).
It must not take a `variant`, a `sticky` boolean, or anything else that makes it
know which header it is. The moment it branches on its caller, it has merged the
items instead of the row — which is the failure this task is most likely to
produce, because it is the convenient shape.

The project has no `clsx`, and this is not the change that introduces one. Each
caller builds one class with `composes:` and passes it in; the component applies
what it is given.

## `composes:` is a cross-file reference, and it has a rule

`composes: row from "…/header-row.module.css"` must be the first declaration in
the rule, and the composing class cannot override a composed property by
declaring it again in the same rule — the output order is not what the source
order suggests. Anything the site header needs to *change* about the row (it
should need nothing) is a bug in the split, not a case for a more specific
selector.

## What must not regress

- **`z-index: 1` on the sticky site header.** It keeps the row above page content
  while staying below the skip link (10) and the toaster (100). Verify by
  scrolling, not by reading the file.
- **`--header-inline-space` cascading.** `.nav` on the site header takes its gap
  from it. Declared on the shared row, it still reaches descendants — but it is
  now declared in a different file from the rule that consumes it, which is worth
  a comment at the consuming end.
- **The tracker's `> :last-child` behaviour.** The site header pushes its last
  child right with `margin-left: auto`; the tracker instead puts `margin-left:
  auto` on `.breadcrumb` to start the right-hand group. These are different
  mechanisms and both must survive — the shared row imposes neither.
- **The `<header>` landmark count.** Exactly one per page, as now. The shared
  component renders it; neither caller may wrap it in another.

## The height, and the one thing to watch

`min-height: 3.5rem` with `box-sizing: border-box` (global) puts the 1px border
inside the 56px. The tracker's 32px avatar then has 11.5px of air per side.

**Check the site header's nav links at the widest font.** At `1rem` their line box
is 25.59px, which fits 56px with room to spare — but it is the item that was
setting the old height, so it is the one to confirm has not started forcing the
row past the declared value.

## Acceptance criteria

1. Every route's header measures the same height, at desktop and phone width, in
   Chrome and Safari.
2. `header-row.module.css` is the only stylesheet declaring the row's height,
   padding-block, font-size or border.
3. `header-row.module.css` declares no `position`.
4. `site-header.module.css` still declares `position: sticky`, `top: 0` and
   `z-index: 1`, and the row still sticks when a long page is scrolled.
5. Every pre-existing test in both header test files passes without being
   edited.
6. Both decided header documents carry a revision recording the reversal.
