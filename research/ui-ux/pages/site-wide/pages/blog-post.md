# Blog Post Page

Status: Decided 2026-07-02.

Individual MDX blog post rendering.

- **Header block**: title, date, and tags (same inline tag style as
  [blog-list.md](./blog-list.md)) at the top of the post, followed by a
  "back to blog list" link back to [blog-list.md](./blog-list.md).
- **Content width**: prose is constrained to a readable max width (not
  full-page-width) — long-form text reads better in a narrower column;
  ties into the readability motivation behind the dark/light theming
  decision in [../../../design-system.md](../../../design-system.md).
- **MDX feature support**: code blocks with syntax highlighting, images,
  and footnotes, all styled consistently with the rest of the site's
  monospace/dark-and-light theme (custom properties/tokens from
  [../../../design-system.md](../../../design-system.md), not a mismatched
  third-party syntax theme).

Uses the [site header](../components/header.md).
