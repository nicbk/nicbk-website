# Feature: A Popup Keeps Its Clicks

**#20** in [../index.md](../index.md). Clicking a popup opens the card behind it.

## What it is

Open a card's "…" menu on the collection, click the popup's own surface — its top
padding, or the details text — and **the article underneath opens**.

Reproduced on `nicbk.com`, 2026-09-14:

```
before   /lit-tracker
click    DIV._popup_  at (385, 198)
         hit-tested first: inside the popup, not a control
after    /lit-tracker/01a092c2-4e2e-7c57-8831-ee610c2ca39a
```

## Why it took three attempts to see

The card's `openUnlessControl` guard already skips
`a, button, input, textarea, select, [role="button"]`, so **every menu item
behaves correctly** — and menu items are what earlier attempts clicked. The
defect only shows on surface that is not a control: the popup's 12px
`padding-top`, and its details block.

That is also why it never looked engine-specific. It is not.

## The cause, and it is not what the DOM suggests

The popup's DOM ancestry is `popup → positioner → div → body`. It is **not**
inside any `<article>`, so native bubbling cannot reach the card's handler — and
yet the click navigates.

**React portals propagate events through the React tree, not the DOM tree.**
`ArticleMenu` is a React child of the `<article>` that carries the `onClick`, so
everything it portals is too.

## How much is affected

Everything rendered inside that `<article>` in the React tree:

| Surface | Via |
|---|---|
| the menu popup | `Popover.Portal` — reproduced |
| **the edit dialog** | `Dialog.Portal` |
| **the delete confirmation** | `Dialog.Portal` |
| title and author tooltips | `Tooltip.Portal` |
| status and tag tooltips | `Tooltip.Portal` |

The dialogs are the ones that matter beyond annoyance: clicking a label while
correcting an article's metadata navigates away from the form.

The card is the **only** container-level click handler in the app today — every
other `onClick` sits on a real control — so there is one site, not a class of
them. The *shape* can recur, which is what the guideline is for.

## What it delivers

- **A card that only answers clicks physically inside it**, so nothing it
  portals can reach it.
- **A test that fails if the guard loses that**, phrased against a portalled
  click rather than against the implementation.
- **The general lesson written down**: handing rendering to a library and then
  reasoning about the DOM instead of the framework's event graph.

## What it does not do

- **It does not add `stopPropagation` to each popup.** That is five call sites
  today and one forgotten call site per component added later — the defect would
  come back by omission. The fix belongs where the handler is.
- **It does not change what a card click does**, or the three cases the guard
  already handles deliberately: controls, the title link, and the end of a text
  selection.
- **It does not touch the reader's or the rail's menus.** Neither sits inside a
  clickable ancestor; checked, not assumed.

## Exit state

A reader can click anywhere on an open menu, dialog or tooltip without the page
navigating out from under them — and the one-line reason it now works is written
next to the code that does it.
