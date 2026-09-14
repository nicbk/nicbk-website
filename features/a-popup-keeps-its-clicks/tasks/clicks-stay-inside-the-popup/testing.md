# Testing: Clicks Stay Inside the Popup

Inherits [the feature's testing notes](../../testing.md).

## Unit — and this tier can genuinely prove it

jsdom models React's synthetic event system exactly as a browser does, so the
defect is reproducible in a unit test. That is unusual for this project's recent
work and worth using.

- **A click inside a portalled child does not navigate.** Render the card with a
  child that `createPortal`s into `document.body`, click a node inside it, assert
  the navigate spy was not called.
- **Assert the portalled node is outside the card in the DOM** — `expect(card.contains(node)).toBe(false)` — in the same test. Without it, a portal
  that happens to render inside the card's subtree makes the assertion pass while
  testing nothing.
- **A click on the card still navigates**, so the fix did not disable the card.
- **The existing exception tests pass unedited**: a control, the title link, the
  end of a selection.

Check the new test by reverting the condition and confirming it fails.

## Browser

The reproduction from [the feature's research](../../research.md), which is the
only check that matters here:

1. Open a card's "…" menu.
2. Hit-test a point in the popup's `padding-top`. **Assert it is inside the popup
   and is not a control** before clicking it.
3. Click. `location` must be unchanged and the menu still open.

Then the same shape for the edit dialog (click a label), the delete confirmation
(click its body text), and a tooltip. And finally: click the card body and
confirm it still opens the article.

**Clicking a menu item proves nothing** — the guard has always skipped controls.
That is how this survived three passes.

Chrome and Safari both, for like-for-like comparison with the reproduction.
