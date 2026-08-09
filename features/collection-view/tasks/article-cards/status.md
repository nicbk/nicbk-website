# Status: Article Cards

**State:** In progress. First of four.

- Branch: `collection-view/article-cards`.
- Sub-issue: [#82](https://github.com/nicbk/nicbk-website/issues/82)
  (parent [#81](https://github.com/nicbk/nicbk-website/issues/81)),
  self-assigned.
- PR: none yet.

## Notes carried into implementation

- **Upgrade `ArticleCollection`, do not replace it.** Its syncing/ready/error
  split, its empty-state wording, and `formatAuthors` all survive this task; what
  changes is how one row is drawn. The component's own docstring says as much.
- **Container query on the card, media query on the grid.** The decided design
  system names the article card as its container-query example. Reaching for a
  page-width media query on the card is the standard mistake here and produces a
  component that breaks the first time it is placed in a narrower panel.
- **Venue is a deliberate addition** to the decided field list, agreed with the
  user because #7 recovers it reliably and nothing displays it. It is optional
  data: most preprints have none.
- **No link, no pointer affordance.** #9 owns navigation.
- **The card is `CollectionArticle`'s consumer** — extend that interface with
  the fields the card needs rather than passing whole rows around. It exists
  precisely to say "the article fields this surface shows".

## What was found in the browser

The first grid was drawn against the four real papers in the local database, and
three things were wrong that no test would have caught. All three are now
recorded as a dated revision in
[collection-view.md](../../../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
rather than as fixes here, because they are decisions about the presentation
rather than about this task.

- **Cards sized to their own content read as a pile of boxes, not a grid.** A
  three-word title beside a three-line one produced visibly different cells.
  Fixed with equal-width tracks, `grid-auto-rows: 1fr`, and text clamped to a
  fixed number of lines — with the full string on a `title` attribute so nothing
  is lost. A native tooltip rather than the component library's is deliberate:
  Base UI's trigger is focusable, and it would put three tab stops on every card
  in a collection whose cards are not otherwise interactive at all.
- **A capped, centred content column left the grid floating** with a wide gutter
  against the sidebar and another against the window. It fills the panel now, so
  the shell's padding is the only inset and every gap on the page is one
  measure. The cap was right when the panel held one narrow list; it stopped
  being right the moment the list became a grid.
- **Clamping the text broke the grid until the cell was given `min-width: 0`.**
  A grid item's automatic minimum is its content's minimum, and `white-space:
  nowrap` makes that the width of the longest venue name in the collection — so
  the tracks grew and the cards ran off the side of the panel. Worth
  remembering as a pair: *any* unwrappable text inside a grid or flex item needs
  the explicit zero minimum, or the elision it was given never gets to happen.
- One layout detail with the same shape: a lone `display: flex` cell sizes its
  card to the card's content, so a short card stayed narrow inside a full-width
  cell. `display: grid` stretches it. Both are one-line fixes that are invisible
  in jsdom, which is exactly why the browser pass is not optional.

And one the browser pass missed, caught by #7's own overflow test at 360px and
nowhere else: **`minmax(18rem, 1fr)` is a hard floor**, so on a panel narrower
than 18rem — a phone width, less the rail and the shell's inset — the single
remaining track is wider than the column it sits in and scrolls the panel
sideways. `minmax(min(18rem, 100%), 1fr)` caps the floor at the column's own
width. Worth carrying: an `auto-fill` grid is not automatically safe at every
width, and the width where it breaks is below the narrowest one a person
usually thinks to drag a window to.
