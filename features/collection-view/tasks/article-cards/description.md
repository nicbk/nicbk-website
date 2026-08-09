# Task: Article Cards

First of four. The collection stops being a list of titles and becomes the card
grid the design has specified since July.

## What this task does

- **Replaces `ArticleCollection`'s plain `<li>` rows with the decided card.**
  Each card shows the article's **title**, its **authors** under the existing
  "fewer than three → all; three or more → first author + et al." rule, its
  **publication year**, and its **venue** where one exists. Fields the article
  lacks are absent — no placeholder text, no empty label. The card is a real
  component with its own `.module.css`, not markup inlined into the collection.
- **Lays the cards out as a grid** that collapses to a single column on narrow
  screens, sharing the same content column as the toolbar above it.
- **Makes the card adapt by container query**, not page width. The decided
  design system names the article card as its example of a component that must
  be correct in whichever container it is placed in — the main grid today, a
  narrower panel in a later feature — so the query belongs on the card, and the
  page-level breakpoints belong to the grid around it.
- **Keeps everything #7 established about states.** Syncing, ready, error, and
  empty are unchanged: an unsynced collection must not render as an empty one,
  and the empty-state wording stays plain inline text. `formatAuthors` is reused
  as-is.

## Why this shape

Every later task in this feature acts on cards — the menu hangs off one, the
filters hide them, search hides them. Building the presentation first means
those tasks are written and reviewed against the real thing rather than against
a list that is about to disappear.

It is also the only task here that is purely read-only, which is precisely what
makes it a good first one: task 2's diff should be about mutators and
authorization, not about a grid layout that happened to land in the same PR.

## Deliberately not a link

`collection-view.md` says clicking a card navigates to the article detail page.
That page is **#9** and does not exist. So the card ships with no link, no
pointer cursor, and nothing else suggesting a click will do something — a card
that looks interactive and is not is worse than one that plainly is not. #9 adds
the navigation, the same way the projects page's tracker entry stayed unlinked
until `/lit-tracker` existed.

## Not in this task

- **The three-dot menu.** It arrives in task 2, with something to put in it.
  Building an empty menu now would be a control that opens onto nothing.
- **Tags on the card.** There are no tags yet — task 2 adds the tables, the
  writes, and the rendering together.
- **Filtering, search, and infinite scroll** — tasks 3 and 4. This task renders
  every article the existing `articles.mine` query returns.
