# Constraints and Behavior: A Popup Keeps Its Clicks

## Behavior

**Clicking an open popup does nothing to the card behind it.** The menu's
padding, the edit dialog's labels, the delete confirmation's text, a tooltip —
none of them navigate.

Everything else about a card click is unchanged: clicking the card opens the
article, and the three cases the guard already excepts stay excepted.

## Constraints

### The fix goes in the handler, not in the popups

`stopPropagation` on each portalled surface is five call sites today and a sixth
whenever a component is added — and the failure mode of forgetting one is silent,
on the surface least likely to be re-tested. The card's handler is the single
place that can be wrong, so it is the single place to correct.

### Keep the three existing exceptions

`openUnlessControl` deliberately ignores:

- clicks inside a control, so each control need not remember to stop propagation;
- clicks the title link already handled, which would otherwise push a duplicate
  history entry and make the back button need two presses;
- the end of a text selection, so a card's text can be copied.

Each is documented with the case that produced it. The new condition is a
fourth, not a replacement.

### The condition asks about the DOM, deliberately

`event.currentTarget.contains(event.target)` is the whole of it. React routed the
event by its own tree; this puts the DOM's answer back in charge, which is the
question the card actually means to ask — *did the reader click me?*

**It must be `currentTarget`, not the card's ref or a class lookup.** The handler
is on the element it is asking about, and `currentTarget` is that element by
definition.

### Nothing else gets "fixed" alongside

Only the card and its title link have handlers that portalled content can reach — the second one inside the router library, and found by clicking rather than by searching. The reader's tool and zoom
menus, the rail's delete-tag dialog, the toaster and the settings modal all
portal too, and none sits inside a clickable ancestor — verified. Touching them
would be changing code that has no defect.

## Acceptance criteria

1. A click on the menu popup's inert surface leaves the route unchanged.
2. The same holds for the edit dialog, the delete confirmation, and both
   tooltips.
3. Clicking the card itself still opens the article.
4. The three existing exceptions still hold: a control, the title link, and the
   end of a selection.
5. The reproduction from [research.md](./research.md) — hit-test the popup's
   padding, click, compare `location` — passes in the browser.
6. No `stopPropagation` added to any popup as part of this.
