# Testing: projects-page-content

The concrete tests this task adds. Tiers and rationale are in the parent's
[testing.md](../../testing.md).

## Unit — `projects-page.test.tsx`

- Exposes exactly one `<h1>`, reading "projects".
- Renders the Literature Tracker entry: both its name and its description
  text are present.
- The entry exposes **no link role** — `queryAllByRole('link')` is empty.
  This is the guard on the "text, not a link yet" decision: when the Phase 3
  feature makes it a link, this test fails and forces that change to be
  deliberate.
- The entries are exposed as a list with one list item.

## End-to-end — `e2e/projects.spec.ts`

- **Smoke**: `/projects` loads with the header visible, the "projects"
  heading, and the entry's name and description both visible.
- **No dead link**: the page's main content contains no links (the header's
  nav links are outside `<main>`), so nothing points at a Literature Tracker
  URL that does not resolve.
- **Narrow viewport**: at a mobile width, `documentElement.scrollWidth` does
  not exceed `clientWidth` — no horizontal page overflow.
- **Axe**: `@axe-core/playwright` in both themes (light, then toggled to
  dark), blocking on critical/serious findings.

Existing `shell.spec.ts` coverage — header `projects` link → `/projects`, and
the focus handoff landing on the heading — must keep passing unchanged against
the real page; no edit to that spec should be needed.

## Manual verification (Chrome)

`/projects` compared against
[projects.md](../../../../research/ui-ux/pages/site-wide/pages/projects.md):
name/description hierarchy reads correctly, the description is clearly
secondary, nothing looks clickable. Checked in both themes at narrow, mid, and
wide widths, scrolling the whole page.
