# Testing: Blog

Testing requirements for the feature as a whole, per the decided testing tiers
(see [research.md](./research.md) for citations). Each task's `testing.md`
states the concrete tests that task must add.

## Tiers in play

No data layer, so the **integration tier** (Testcontainers Postgres/Garage)
does not apply. Coverage is unit + e2e + inline accessibility, plus the
**build-time** frontmatter/alt-text validation that acts as an additional gate
(a malformed post or an image without alt text fails the build).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Frontmatter schema** (`blog/frontmatter-schema.ts`): valid frontmatter
  parses; missing a required field (`title`/`date`/`description`) or a
  malformed `date` throws; optional fields default correctly (`draft` → false);
  the inferred type matches the schema.
- **Post page** renders a compiled sample post's header block (title, date,
  tags, "back to list" link with the correct href) and its body (a code block,
  a `<Callout>`, an image with its alt text).
- **List page** renders one row per non-draft post, **newest first**, each row
  showing date / title / one-line description / inline tags and linking to the
  correct `/blog/<slug>`; a `draft: true` post is **absent**; the empty case
  renders the plain-text empty state.
- **Search/filter** (component-level, over a fixed set of sample metadata):
  typing narrows to posts matching title/description/tags; toggling a tag
  narrows to posts with that tag; multiple tags multi-select; clearing
  restores the full list.
- Any non-trivial pure helper (date formatting, the search/tag predicate,
  reverse-chron sort) is unit-tested directly.

## Build-time validation (acts as a gate)

- A post with malformed/missing required frontmatter **fails the build** (Zod),
  not silently rendering a broken row — asserted via the schema unit tests and
  reinforced by CI building the real posts.
- An image with missing/empty alt text **fails the build**
  (`remark-lint-no-empty-image-alt-text`).
- Build-time highlighting: no syntax-highlighter runtime library is shipped to
  the client (highlighting is baked into the rendered HTML).

## End-to-end (Playwright)

- **List smoke:** `/blog` loads inside the header, shows the list heading and
  the sample posts newest-first, and each row links to a post.
- **Post smoke:** navigating from a list row (and visiting `/blog/<slug>`
  directly) renders the post with its title, highlighted code, callout, and
  image; the "back to list" link returns to `/blog`.
- **Unknown slug:** `/blog/<nonexistent>` returns a real **HTTP 404** and the
  not-found treatment, not an empty post.
- **Search/filter (URL state):** typing in the search bar and toggling a tag
  filter narrows the list and is **reflected in the URL**; reloading the
  filtered URL restores the same filtered view; back/forward navigates the
  filter history.
- **Metadata:** the list and a post each expose the expected document
  `<title>` and `meta name="description"`.
- **Theming:** no flash of the wrong theme; correct in both themes (reuses the
  shared theming assertions).

## Accessibility

- `@axe-core/playwright` runs inline on `/blog` and on a post page in both
  themes, blocking on critical/serious findings.
- Heading structure is valid; the search field and each tag toggle have
  discernible accessible names and are keyboard operable; a tag toggle conveys
  its pressed/selected state; contrast and focus indicators meet AA in both
  themes.

## Coverage / gating

- Vitest `v8` coverage, unit-only, ratchet-style (must not drop PR-over-PR).

## Framework caveat to carry

Same flagged TanStack Start + Playwright hydration/routing-timing flakiness as
the shell feature: assert on settled DOM state (and settled URL search params
for the filter tests), don't race hydration.
