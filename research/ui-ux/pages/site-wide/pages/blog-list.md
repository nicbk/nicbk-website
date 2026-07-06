# Blog List Page

Status: Decided 2026-07-02.

Flat reverse-chronological list of posts, matching
[blog-page.png](../../../../../high-level-guidance/design/blog-page.png)'s
row layout: date, title, one-line description, each post one row, columns
vertically aligned across rows via CSS grid (not just inline flex) so dates/
titles/descriptions line up neatly down the page, as in the mockup.

- **Tags**: displayed inline after the description on each row (not a
  separate pill/badge treatment), e.g.
  `2026-06-19  Random  blablabla  [react] [meta]`.
- **Pagination**: infinite scroll (not numbered pagination) — fits the
  design philosophy's low-friction guidance better and avoids page-number
  navigation UI.
- **Search**: a search bar in the same style as the lit tracker's (see
  [../../../sample-mockups/literature-tracker-sample.png](../../../sample-mockups/literature-tracker-sample.png)
  / [../../lit-tracker/pages/collection-view.md](../../lit-tracker/pages/collection-view.md)).
- **Tag filtering**: a sidebar of toggleable tag filters, in the same style
  as the lit tracker's sidebar filter tags (the `asdf`/`fasdf` buttons in
  the sample mockup).

Uses the [site header](../components/header.md).
