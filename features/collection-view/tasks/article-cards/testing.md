# Testing: Article Cards

What this task's tests must cover, within the feature's overall requirements
([../../testing.md](../../testing.md)).

## Unit (Vitest + `@testing-library/react`, jsdom)

The card is presentational — it takes a row and renders it — so all of this runs
without a Zero client, the way `ArticleCollection`'s existing tests do.

- **A complete article** renders its title, its authors, its publication year,
  and its venue.
- **Author formatting**: one author renders alone; two render both; three or
  more render the first followed by "et al.". (`formatAuthors` already has its
  own tests; these assert the card *uses* it, not that it works.)
- **A sparse article** — no venue, no year — renders neither, and produces no
  empty label, stray separator, or dangling punctuation. This is the case a
  preprint actually is, so it is not a hypothetical.
- **Every line carries its full text as a `title`**, since every line is
  clamped — that attribute is the only place an elided title is readable from.
- **The card is not a link**: no anchor, no `role="link"`, no click handler.
- **The collection renders one card per article**, as a list, with the article's
  id as the key.
- **The three states are unchanged**: `syncing` renders the loading placeholder
  and neither empty text nor cards; `ready` with no articles renders the
  empty-collection text; `error` renders the error notice with `role="alert"`.
  These exist today and must keep passing — the point of listing them is that
  they are the regression risk of replacing the list markup.

## End-to-end (Playwright, signed-in suite)

- **Cards render against seeded articles**, showing the metadata #7's pipeline
  produced — including venue and year, which nothing has displayed before.
- **Layout across widths**: the grid shows multiple columns at a wide width and
  a single column at a narrow one, with no horizontal overflow at any of narrow,
  mid, or wide.
- **Uniform cells**: two articles with wildly different amounts of text produce
  cards of identical width and height, and the longer title is demonstrably
  clipped rather than fitting by luck — without that second assertion the equal
  heights prove nothing.
- **Both themes** are correct, with no flash of the wrong theme.
- **The upload flow still works.** The "+" button and status indicator are
  directly above the surface this task rewrites; #7's existing e2e coverage of
  them must stay green.

## Accessibility

- `@axe-core/playwright` runs inline on `/lit-tracker` **with cards present** —
  the existing scans ran against an empty or list-shaped collection — in both
  themes, blocking on critical/serious findings.
- The grid exposes as a list; the heading structure remains valid with the
  clipped `<h1>` as the only top-level heading; card text meets AA contrast in
  both themes.

## Manual verification (required, not optional)

Per [AGENTS.md](../../../../AGENTS.md)'s browser-verification rule, and against
the mockup rather than against "it looks fine": load the running page beside
[literature-tracker-sample.png](../../../../research/ui-ux/sample-mockups/literature-tracker-sample.png),
scroll the whole collection, and check both themes at narrow, mid, and wide
widths. A grid is exactly the kind of thing that is correct at the one width it
was built at.
