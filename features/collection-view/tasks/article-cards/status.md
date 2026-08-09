# Status: Article Cards

**State:** Not started. First of four.

- Branch: `collection-view/article-cards` (not yet created).
- Sub-issue: not yet filed.
- PR: none.

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
