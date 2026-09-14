# Constraints and Behavior: Clicks Stay Inside the Popup

Inherits [the feature's](../../constraints-and-behavior.md). Specific to doing
it:

## The comment carries the weight

`event.currentTarget.contains(event.target)` reads as obviously true to anyone
who has not met React's portal behaviour — the handler is on the card, so surely
the click was in the card. It is exactly the kind of line that gets deleted as
redundant.

The comment must say **why it is not**: that React routes synthetic events along
its own tree, that the popup is not a DOM descendant, and that this was
reproduced rather than theorised. A reader who understands that will not remove
it.

## `currentTarget`, not a ref

The handler is attached to the element being asked about, so `currentTarget` *is*
that element. A ref or a `closest()` lookup would say the same thing less
directly and could drift if the markup moves.

## Order it with the cheap checks

The existing guard already returns early on `defaultPrevented`, on a control, and
on a text selection. `contains` is a DOM walk; put it where it reads naturally
with the others rather than optimising, but do not put it after the `getSelection`
call, which is the most expensive of them.

## Acceptance criteria

1. A click from a portalled descendant does not navigate.
2. A click on the card still navigates.
3. The three existing exceptions still hold, and their tests pass unedited.
4. No `stopPropagation` anywhere.
5. The condition uses `currentTarget` and carries a comment explaining the
   React-tree behaviour.
6. The browser reproduction — hit-test the popup's inert padding, click, compare
   `location` — no longer reproduces, in Chrome and Safari.
