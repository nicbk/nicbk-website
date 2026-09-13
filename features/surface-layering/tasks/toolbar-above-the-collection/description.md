# Task: Toolbar Above the Collection

**Task 1 of 2.** Writing down an order the code left to the engine, and that one
engine gets wrong.

## What it does

- **Puts the collection's control row above the cards explicitly** —
  `isolation: isolate` on the page, `z-index: 1` on the toolbar — instead of
  relying on a default that Safari resolves the other way.
- **Keeps menus, dialogs and backdrops above the row**, which a bare `z-index`
  does not: isolation is what confines the row's layer to the page subtree so it
  cannot compete with body-level portals.
- **Replaces the comment that got it wrong.** The current one argues no
  `z-index` is needed because "positioned elements paint after in-flow content
  regardless". The new one says what the row beats, what beats it, why isolation
  is required for both to be true, and that Safari is where it was caught.
- **Adds the engine to the project's browser-verification rule** in AGENTS.md,
  because this task is the evidence that a single-engine pass can sign off a
  defect that is live in production.

## What it does not do

- **No change to the row's transparency.** It deliberately has no background of
  its own so the collection is visibly passing behind it. That is a separate
  decision, separately reasoned, and it stays.
- **No change to the sticky offset.** The negative `top` cancels the panel's
  padding and is already correct.
- **No site-wide z-index scale.** One subtree, one layer.
- **No new component and no markup change.** Two CSS declarations and a comment.

## Exit state

A reader scrolling their collection in Safari — on `nicbk.com`, where they
reported it — sees the search row stay put while cards pass beneath it, and
still sees a card menu open over that row and the upload modal dim it.
