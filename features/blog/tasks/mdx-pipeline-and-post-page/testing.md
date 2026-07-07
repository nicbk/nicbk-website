# Testing: MDX Pipeline + Post Page

## Unit (Vitest + Testing Library)

- **Frontmatter schema:** valid frontmatter parses to the expected object;
  missing a required field (`title`/`date`/`description`) or a malformed `date`
  throws; `draft` defaults to `false`; `tags` defaults sensibly; the inferred
  type matches the schema shape.
- **Post page** renders a compiled sample post: the header block (title, date,
  `updated` shown only when present, inline tags, and a "back to blog list"
  link with href `/blog`) and body content including a code block, a
  `<Callout>`, and an image carrying its alt text.
- Exactly one main heading is present (focus-handoff target / document
  structure).
- **`<Callout>`** renders its `type` variants with the correct accessible
  treatment; the **`img` override** renders the provided alt text.

## Build-time validation (acts as a gate)

- Building the committed sample posts succeeds; a post fixture with malformed
  frontmatter fails schema validation (asserted at the unit level), and an
  image without alt text fails the remark-lint rule — both surfaced at build,
  not runtime.
- No syntax-highlighter runtime library is present in the post page's client
  bundle (highlighting is baked into the rendered HTML).

## End-to-end (Playwright)

- **Post smoke:** visiting a sample post's `/blog/<slug>` directly renders it
  inside the header with its title, highlighted code, callout, and image; the
  "back to blog list" link points to `/blog`.
- **Unknown slug:** `/blog/<nonexistent>` returns a real **HTTP 404** and the
  not-found treatment.
- **Metadata:** the post exposes the expected document `<title>` and
  `meta name="description"` from its frontmatter.
- **Theming:** no flash of the wrong theme; the post (prose + code) is correct
  in both themes.

## Accessibility

- `@axe-core/playwright` inline on a sample post passes (critical/serious) in
  both themes.
- Heading structure valid; in-content and "back to list" links have discernible
  names; code/prose contrast and focus indicators meet AA in both themes.

## Not tested here

- The `/blog` list page, draft exclusion, infinite scroll (task 2).
- Search/tag filtering and its URL state (task 3).
- Cross-page navigation mechanics beyond the post↔list link (covered by the
  shell feature).
