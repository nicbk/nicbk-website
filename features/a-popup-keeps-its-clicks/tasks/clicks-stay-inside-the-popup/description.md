# Task: Clicks Stay Inside the Popup

Task 1 of 1 of [a-popup-keeps-its-clicks](../../description.md) (#20).

## What it does

Adds one condition to the article card's `openUnlessControl`, so the card answers
only clicks that are physically inside it.

React portals propagate events through the **React** tree, so everything the card
renders — its menu popup, the edit dialog, the delete confirmation, and both
tooltips — reaches the card's `onClick` even though none of them is a DOM
descendant of it. Asking the DOM whether the click was inside puts that right for
all five at once, and for the sixth nobody has written yet.

## What changes

**`article-card.tsx`** — a fourth exception in `openUnlessControl`, beside the
three already there, with a comment explaining why a line that reads as a
tautology is not one. That comment is the load-bearing part: without it the
condition is the first thing a later cleanup removes.

**`article-card.test.tsx`** — a test that clicks inside a real portal and asserts
no navigation, and that asserts the portalled node is outside the card in the
DOM, so it cannot pass for the wrong reason.

**`AGENTS.md`** — the general lesson, per the standing rule about fixing mistakes
at the level of the principle.

## What it does not change

- What clicking a card does, or the three exceptions the guard already makes:
  controls, the title link, and the end of a text selection.
- Any popup. No `stopPropagation` is added anywhere — that is the approach this
  task exists to avoid.
- The reader's or the rail's menus. Neither has a clickable ancestor; checked.
