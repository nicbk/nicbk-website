# Lit-tracker Header

Status: Decided 2026-07-04.

A separate component from the
[site header](../../site-wide/components/header.md) (not a variant of it) —
each sub-application gets its own header. Rough shape visible in
[../../../sample-mockups/literature-tracker-sample.png](../../../sample-mockups/literature-tracker-sample.png):
app name ("Literature Tracker") on the left, breadcrumb-style path indicator
(`↳/nicbk_home`) and user avatar on the right. Used as page context by both
[collection-view.md](../pages/collection-view.md) and
[article-detail.md](../pages/article-detail.md).

- **App name (left)**: acts as the lit-tracker's home link — clicking it
  navigates to [collection-view.md](../pages/collection-view.md), same
  pattern as the site-wide header's site name.
- **Breadcrumb (right of app name)**: on
  [collection-view.md](../pages/collection-view.md) (the lit-tracker's
  root), shows just the root segment, e.g. `↳/nicbk_home`. On
  [article-detail.md](../pages/article-detail.md), grows one segment per
  citation-graph hop (e.g. `↳/nicbk_home/Article A/Article B`), each segment
  clickable to jump back to that point in the path — see
  [citation-graph.md](./citation-graph.md) for the traversal/reset
  mechanics this depended on.
  - **Narrow-screen overflow**: middle segments truncate with an ellipsis
    (e.g. `↳/nicbk_home/…/Article B`), expandable on click/tap to reveal the
    full path, rather than a horizontally-scrolling bar.
- **User avatar (far right)**: opens the shared
  [user-settings.md](../../site-wide/components/user-settings.md) profile/
  settings modal — not a lit-tracker-specific settings surface.
- **Layout model — fixed app shell, not a scrolling-page sticky header**:
  unlike the site-wide header (a simple `position: sticky` header on an
  otherwise normally-scrolling page, see
  [../../site-wide/components/header.md](../../site-wide/components/header.md)),
  the lit-tracker's pages are app-shell-style: the header's height is fixed/
  reserved at the top of the viewport, and it is not part of the scrolling
  document at all. Content below it scrolls in independent, bounded panels
  instead of the whole page scrolling as one unit — e.g.
  [collection-view.md](../pages/collection-view.md)'s infinite-scroll
  article grid scrolls independently of its filter sidebar, and
  [article-detail.md](../pages/article-detail.md)'s PDF reader/citation
  graph main content scrolls independently of its Tags/Notes/Citations/
  Annotations sidebar.

## Revision (2026-08-02), decided with the user at implementation

Building this for `/lit-tracker` moved two controls. The decision above stands
on the layout model and on the header being its own component; what changed is
which controls sit in the header row.

- **The account avatar moved out of the header, to the foot of the sidebar.**
  That is where
  [../../../sample-mockups/literature-tracker-sample.png](../../../sample-mockups/literature-tracker-sample.png)
  actually puts it — the bullet above read the mockup's avatar as belonging to
  the header row, and it does not. It still opens the same shared
  [user-settings.md](../../site-wide/components/user-settings.md) modal; only
  its home changed. The sidebar it sits in is the same rail that holds
  [collection-view.md](../pages/collection-view.md)'s tag filters.
- **The avatar shows the Google account's own picture**, falling back to a
  single letter when there is none, when the account has no image, or when the
  third-party request fails. The mockup's lettered square is that fallback.
- **The theme toggle joined the header, at its far end** — the same component
  and the same position it holds on the
  [site header](../../site-wide/components/header.md). Without it the tracker
  would have been the one part of the site with no way to change theme, since it
  deliberately does not use the site-wide header; that gap is a consequence of
  giving each sub-application its own header, so every later sub-application
  header should carry the toggle too.
- **The breadcrumb's root segment is the personal site, and links to it.**
  `nicbk_home` is literal and identical for every account — it names the site
  this sub-application is hosted on, the same owner the site header spells out
  as "Nicolás Kennedy". It is *not* derived from whoever is signed in, and it is
  *not* a second route to the tracker root: the app name on the left is that.
  Reading it as a per-reader handle is the natural misreading, and it is wrong —
  the path runs from the site's home outwards, which is exactly why
  [article-detail.md](../pages/article-detail.md) grows it into
  `↳/nicbk_home/Article A/Article B`.
- **The row splits left and right**, like the site header: app name alone on the
  left; the path and then the theme toggle grouped on the right, the path
  immediately left of the toggle.

The resulting row reads like the site header — name, then path, then the theme
toggle pushed to the far end — which is the point: the two should look like the
same site rather than two products.

## Revision (2026-08-09), decided with the user at implementation

**The account avatar came back to the header**, between the path and the theme
toggle — restoring the original 2026-07-04 placement and reversing the first
bullet of the revision above. It was moved to the sidebar because that is where
the mockup draws it; what the mockup could not show is what the sidebar looks
like once it holds a real filter list. Building
[collection-view.md](../pages/collection-view.md)'s tag rail put thirty tags in
that rail, and a single avatar pinned beneath them reads as the last item of the
list rather than as the account control. The header is where the rest of the
site keeps account-level controls, and it is visible at every width.

Two consequences worth recording, because they are what makes this simpler
rather than merely different:

- **The rail now holds one thing.** It no longer splits into a scrolling region
  plus a pinned foot, and it no longer has to survive being reduced to a bar on
  a narrow screen — below the breakpoint it goes away entirely, with its filters
  moving into the drawer that
  [collection-view.md](../pages/collection-view.md)'s revision describes.
- **The account control no longer depends on the rail existing.** It sits above
  the panels and outside the Zero provider, so it works at any width and whether
  or not sync ever connects — which is precisely when signing out matters most.

The row is now: app name on the left; path, account, theme toggle on the right,
in that order.

## Revision (2026-08-13), decided with the user at implementation

**The article being read is named in this row, beside the app name — not as a
segment of the breadcrumb.** Two changes, and the first is what forced the
second.

- **The detail page's metadata header is gone, and its title came up here.**
  [article-detail.md](../pages/article-detail.md) puts a metadata summary —
  title, authors, venue — across the top of the page. Built, it cost roughly a
  fifth of the content panel's height to state three facts, on the one page in
  the tracker whose entire purpose is showing as much of a document as possible.
  The title moved into this row; the authors and venue moved into the page's
  three-dot menu, which was already its "about this article" surface. The page
  keeps a clipped `<h1>` for the route-change focus handoff, exactly as
  [collection-view.md](../pages/collection-view.md) already does.
- **It sits beside the app name, behind a vertical rule, rather than at the end
  of the path.** The 2026-07-04 decision above put it in the breadcrumb, and
  that is what was built first — then read wrong on screen.
  `↳/nicbk_home/Attention Is All You Need` is a path rooted at the *personal
  site*, so a paper's title arriving at its end looked like a page on that site
  rather than the thing open in the tracker. `Literature Tracker │ Attention Is
  All You Need` reads as what it is. The breadcrumb goes back to being the one
  thing it was always unambiguous about: where this sub-application is hosted.

**What this leaves #10 to decide.** The 2026-07-04 bullet's real subject was
citation-graph traversal — `↳/nicbk_home/Article A/Article B`, one segment per
hop, each clickable to jump back. That requirement is untouched and still
unbuilt; what is now unsettled is *where the trail of hops goes*, given the
current article is named beside the app name rather than at the end of the path.
Either the hops extend the breadcrumb and the two coexist, or the title slot
grows into the trail. That is a decision for the feature that introduces
traversal, and it should be made against a working graph rather than in advance —
which is the same reasoning that produced this revision.
