# Testing: A Popup Keeps Its Clicks

## Unit

The behaviour is entirely about event routing, which jsdom models faithfully —
React's synthetic system works there exactly as it does in a browser. **So unlike
most of this project's recent features, the unit tier can actually prove this
one.**

- **A click from a portalled child does not navigate.** Render an article card
  whose children include a real `createPortal` into `document.body`, click inside
  the portalled node, and assert the router was not asked to navigate.
- **The portalled node is genuinely outside the card in the DOM.** Asserted in
  the same test, because without it the test can pass for the wrong reason: a
  portal rendered into the card's own subtree is a DOM descendant, `contains`
  returns true, and nothing has been tested.
- **A click on the card still navigates**, so the fix has not simply disabled the
  feature.
- **The three existing exceptions still hold** — a control, the title link, and a
  click ending a text selection. These have tests already; they must pass
  unedited, since the new condition is a fourth exception and not a replacement.

Check the new test by reverting the condition and confirming it fails.

## Browser

Against the reproduction in [research.md](./research.md), which is what turned
this from a report into a defect.

| Check | How |
|---|---|
| the menu popup | open a card menu; hit-test its `padding-top`; **assert the point is inside the popup and is not a control**; click; `location` unchanged |
| the edit dialog | open it from the menu; click a label; still on the collection, form still open |
| the delete confirmation | open it; click its body text; still on the collection, dialog still open |
| a tooltip | hover an elided title; click the tooltip; `location` unchanged |
| the card still works | click the card body; navigates to the article |

**The hit-test is not optional.** Clicking a menu *item* passes with or without
the fix, because the guard has always skipped controls — a check that clicks the
obvious target proves nothing, which is precisely how this defect survived three
earlier passes.

Run it in Safari as well as Chrome. Not because the mechanism is engine-specific
— it is not, being React's own event system — but because the reproduction was
taken there and the comparison should be like for like.

## Not covered

**No e2e specs** — deferred project-wide until the tracker is built out.

**The delete confirmation's destructive path.** The click being tested is on the
dialog's inert surface; nothing in this feature presses "delete". If a browser
check ever needs a real article deleted, record the id at creation and delete by
id — never by a `created_at` window.
