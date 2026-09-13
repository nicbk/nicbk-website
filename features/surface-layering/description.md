# Feature: Surface Layering

**#16** in [../index.md](../index.md). Deciding what is on top, in the two
places where nobody decided and the browser picked.

## What it is

Two surfaces in the Lit Tracker layer wrongly, and both for the same reason: the
code states no order, so the order is whatever the engine's default painting
rules produce.

- **The collection toolbar loses to the cards.** Scrolling the collection draws
  cards straight over the sticky search row — over the search pill itself, not
  merely through the gaps between controls. **In Safari.** In Chrome the same
  page at the same width scrolls correctly.
- **The reader's annotation box loses to the reader toolbar.** A mark's controls
  are drawn underneath the bar instead of over it, so the reader cannot see or
  reach what they just marked when the two overlap.

## Why it is worth a feature

Because it is one cause with two faces, and because the cause is a class of
mistake this project has already written a guideline about. AGENTS.md says *an
order you did not choose is not an order you can rely on* — written after two
ordering bugs in one feature. Both surfaces here rely on `z-index: auto` and
document order, and each carries a comment explaining why no `z-index` was
needed. One of those comments is wrong in Safari; the other is right about the
pages and wrong about everything else the engine draws.

It is also the feature that closes the loop on a **verification gap**. The
toolbar defect has been in production and was never caught, because every
browser pass this project has done was Chrome-only. Finding it needed the engine
the user actually reads in.

## What it delivers

- **The collection toolbar above the collection**, in both engines, without
  rising above the menus and modals that must still cover it.
- **The annotation box above the reader toolbar**, without letting the paper
  itself back over the bar — the defect the current rule was added to fix.
- **Explicit layers where there were implicit ones**, so the next component
  added to either surface has a stated order to join rather than a coincidence
  to preserve.

## What it does not do

- **No global z-index scale.** Two surfaces, each confined to its own subtree.
  A site-wide layer registry is a larger decision and nothing here needs it.
- **No change to the toolbar's transparency.** The row deliberately has no
  background of its own so the collection is visibly passing behind it
  (collection-toolbar.module.css). That is a separate decision and it stays;
  this feature is about what paints on top, not what is see-through.
- **No change to what EmbedPDF draws or where it positions it.** The pages keep
  the wrappers the engine gives them.

## Exit state

A reader scrolling their collection in Safari sees the search row stay put and
the cards pass beneath it. A reader marking a passage sees the mark's controls
over the toolbar rather than behind it. And in both places the order is written
down, with a test that fails if it silently changes.
