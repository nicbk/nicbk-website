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

## Open question raised at implementation (2026-08-02)

Building this header for `/lit-tracker` surfaced one thing the decision above
does not cover: **there is no theme toggle anywhere in the Lit Tracker.** The
list above is app name, breadcrumb, and avatar, and
[../../../design-system.md](../../../design-system.md) places the toggle on the
site-wide header surface — which the tracker deliberately does not use. So a
reader inside the tracker cannot change theme without leaving for the personal
site.

It is not broken: the choice is stored in `localStorage` and applies site-wide,
so switching once on the personal site persists into the tracker. But it is a
gap created by the (correct) decision to give each sub-application its own
header, and it will apply to every sub-application added later. The
implementation followed the spec as written rather than adding a fourth item;
recorded here so the next header does not rediscover it.
