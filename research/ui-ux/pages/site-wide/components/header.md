# Site Header

Status: Decided 2026-07-02.

**Structure**: bold site name/logo ("Nicolás Kennedy") on the left, linking
to the home page (no separate "home" nav link needed); nav links
(`projects`, `blog`, `about`) to the right of it, single row; thin
horizontal divider below, separating the header from page content. Matches
[home-page.png](../../../../../high-level-guidance/design/home-page.png) /
[about-page.png](../../../../../high-level-guidance/design/about-page.png) /
[blog-page.png](../../../../../high-level-guidance/design/blog-page.png).

- No auth UI in this header — the personal site itself has no sign-in; auth
  only lives inside sub-applications that need it (see
  [sign-in.md](../pages/sign-in.md) / [user-settings.md](./user-settings.md)).
- No active-page indication.
- Mobile: stays a single row at all widths, no hamburger/drawer — 3 links +
  the site name is little enough that collapsing them behind a menu adds
  friction for no real space benefit. Font size may shrink slightly via
  `clamp()` on very narrow screens to avoid wrapping.
- **Sticky**: the header (and its divider) stays fixed in place as the page
  scrolls, remaining visible at all scroll positions. Not obvious from the
  static mockups, confirmed directly by the user.

Distinct from the lit-tracker header — see
[../../lit-tracker/components/header.md](../../lit-tracker/components/header.md).
