# Task: Article Detail Shell

**First of five.** Gives an article a page, and gives the card somewhere to go.

This task builds `/lit-tracker/$articleId` — everything the decided detail page
has *except the paper itself*: the metadata summary across the top, the tabbed
left sidebar with Tags and Notes, and the drawer that sidebar becomes on a
narrow screen. The main content area, where the reader will go, holds an honest
placeholder saying so.

It is the only task in this feature with no new technology in it. Every part is
assembled from what #7 and #8 left: the route group's guard and app shell, the
card's three-dot menu, the tag toggles and their mutators, the filters drawer,
and `formatAuthors`. What is genuinely new is one route, one tab interface, and
one mutator for the notes column.

## What it does

- **The route.** `/lit-tracker/$articleId`, inside the existing `/lit-tracker`
  route group so the auth guard, the header, the app shell, and the Zero client
  all come from the layout that is already there. The article is read from the
  synced rows, not fetched.
- **The metadata summary.** Title, authors (the shared "3 or more → first author
  + et al." rule), year, and venue, each shown only when the article has it,
  with **#8's three-dot menu** beside it — the same component, holding the same
  tag and reading-status controls.
- **The sidebar, as tabs.** Tags and Notes in this task; Annotations arrives in
  task 5. **No Citations tab is rendered** — #10 adds it.
  - **Tags** — this article's tags as toggles, including its reading-status tag,
    driven by #8's existing mutators. A second view of a working model.
  - **Notes** — a free-text field writing `articles.notes`, saving as the user
    types with no save button, and never clobbering in-progress text when a
    synced value arrives.
- **The responsive drawer.** Below the breakpoint the sidebar collapses into the
  toggleable drawer #8 built for the filters, **collapsed by default**; above
  it, the sidebar is **open by default**.
- **The card becomes a link.** `/lit-tracker`'s cards have never navigated
  because this route did not exist. Now it does. The card's three-dot menu must
  keep working without its clicks reaching the link.
- **The placeholder.** The main content area says the reader is coming, the same
  way #7's toolbar reserved the search slot rather than collapsing it — so
  task 3 fills a space that already exists instead of rearranging the page.

## What it does not do

- **No PDF**, no reader, no EmbedPDF dependency. Tasks 2 and 3.
- **No annotations** and no `annotations` table. Task 4.
- **No Annotations tab.** Task 5.
- **No Citations tab**, and no citation data. #10.
- **No metadata editing and no article deletion.** #11 extends the menu this
  task mounts.
- **No new tag model.** If something about tags needs changing to work here,
  that is a signal to change #8's component, not to write a second one.

## Exit state

Every article in the collection has a page of its own, reachable by clicking its
card, showing everything the tracker knows about it except the document — and
the sidebar there can tag it, set its reading status, and hold the reader's own
notes, live across clients.
