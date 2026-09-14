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
*(Revised 2026-09-13 — the two now share the row; see below.)*

## Revision (2026-09-13): the row is shared, the items are not

**Decided with the user.** The two headers stop being separate implementations of
a similar row and become **one row component rendered with two sets of items**.

Nothing above changes about *this* header's contents or behaviour: the bold name
linking home, the three nav links, no auth UI, no active-page indication, the
single row at every width, the sticky positioning. What changes is that the row
itself — its height, its inline rhythm, its type scale, its surface and its
divider — is now declared once, in a shared component, instead of separately here
and in the tracker.

**Why, and it is not tidiness.** The two rows were never *decided* to be different
heights; they simply computed to different heights, because each stylesheet
summed its own padding with whatever its tallest item happened to be. Measured:
**58.59px here against the tracker's 57.00px** at desktop, identical at 500px, and
this header's value is fractional — Safari reports it as a flat 58. The user
could see the difference, reported it, and chose the merge over reconciling two
numbers. Two values that must agree and are written in two places is the
duplication AGENTS.md warns about; these two had already drifted.

**What stays separate, deliberately:** the items, and the positioning. This header
is `position: sticky` on a page that scrolls as one unit; the tracker's is the
fixed top edge of an app shell whose document never scrolls. The shared row
positions nothing — each caller supplies that. The original decision that "each
sub-application gets its own header" was about **identity**, and identity lives in
the items, which are untouched.

Tracked as **#17 `one-header-row`** in `features/index.md`.
