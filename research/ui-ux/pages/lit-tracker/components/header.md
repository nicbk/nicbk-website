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
