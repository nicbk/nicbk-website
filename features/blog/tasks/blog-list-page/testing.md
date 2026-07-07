# Testing: Blog List Page

## Unit (Vitest + Testing Library)

- The list renders **one row per non-draft post, newest first**, each row
  showing date / title / one-line description / inline tags and linking to the
  correct `/blog/<slug>`.
- A `draft: true` post is **absent** from the rendered list.
- The **empty case** (no non-draft posts) renders the plain-text empty state —
  no spinner, no illustration.
- The reverse-chronological **sort helper** and any date-formatting helper are
  unit-tested directly (given unsorted metadata, output is newest-first).
- The listing helper returns **frontmatter only** (no compiled post body) — the
  guard against eager bundling.

## End-to-end (Playwright)

- **List smoke:** `/blog` loads inside the header, shows the main heading and
  the sample posts newest-first; clicking a row navigates to that post.
- **Draft exclusion:** the `draft: true` sample post does not appear in the
  production-server list.
- **Infinite scroll:** with enough sample posts, additional rows reveal on
  scroll (or all fit and none are hidden) — asserted on settled DOM.
- **Metadata:** `/blog` exposes the expected document `<title>` and
  `meta name="description"`.
- **Theming:** no flash of the wrong theme; the list is correct in both themes.

## Accessibility

- `@axe-core/playwright` inline on `/blog` passes (critical/serious) in both
  themes.
- Heading structure valid; every post link has a discernible accessible name;
  row/link contrast and focus indicators meet AA in both themes; the grid's
  reading order is sensible.

## Not tested here

- Search and tag filtering / URL search-param state (task 3).
- The post page rendering and the MDX pipeline (task 1).
