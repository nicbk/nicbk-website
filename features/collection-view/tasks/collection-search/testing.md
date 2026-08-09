# Testing: Collection Search

What this task's tests must cover, within the feature's overall requirements
([../../testing.md](../../testing.md)).

## Unit (Vitest + `@testing-library/react`, jsdom)

- **The search predicate** (pure): matches on title, on an author's name, on a
  tag name, and on a reading status; is case- and surrounding-whitespace-
  insensitive; a query matching nothing returns nothing; an article missing a
  field is not matched by a query against that field (an article with no venue
  must not match every query).
- **Composition**: search AND tags AND status intersect. A query that matches an
  article the rail's filters exclude leaves it hidden — the single most
  important assertion in this task, because it is the one that proves there is
  one predicate rather than two competing ones.
- **Typing filters immediately**: the visible set reacts to a value change with
  no submit and no waiting on a URL navigation. The URL mirror being debounced
  must not gate the list — that separation is the reason the blog's hook keeps
  local state at all.
- **URL round-trip**: a query serializes and reads back; an empty query leaves
  no key in the URL.
- **Incremental reveal**: the first batch renders without an
  `IntersectionObserver` (as in jsdom); the visible count grows when the sentinel
  intersects; the sentinel disappears once everything is shown; **the reveal
  applies to the filtered set**, so narrowing while partly revealed does not
  strand rows.
- **"No articles match"** appears for a query that excludes everything, and
  never while the collection is still syncing.

## End-to-end (Playwright, signed-in suite)

- **Typing narrows the grid** without a submit, and clearing restores it.
- **An author name and a tag name** both find their article, not just a title.
- **Search composes with a rail selection**, and the combined state survives a
  reload.
- **Infinite scroll**: with more articles than one batch, the first screenful
  renders and scrolling reveals the rest, down to the last card.
- **Toolbar alignment**: the "+" button and the status indicator sit immediately
  against the search input's trailing edge at narrow, mid, and wide widths, with
  no horizontal overflow and no gap opening up between them and the input.
- **The upload flow still works** from its new position — #7's coverage of the
  modal and the status popup must stay green. This task moves the controls; it
  must not disturb them.
- **Both themes.**

## Accessibility

- `@axe-core/playwright` runs inline on `/lit-tracker` with the search active,
  in both themes, blocking on critical/serious findings.
- The input has a discernible label; result-count changes are announced by a
  polite status region that does **not** fire per keystroke; focus stays in the
  input while typing filters the grid beneath it.

## Manual verification (required)

Per [AGENTS.md](../../../../AGENTS.md)'s browser-verification rule, and because
this is a feature whose whole point is responding continuously: type and delete
continuously rather than pasting a query once, and watch the grid keep up
mid-interaction. Then scroll a long collection to its end in both themes at
narrow, mid, and wide widths, and check the toolbar row against
[literature-tracker-sample.png](../../../../research/ui-ux/sample-mockups/literature-tracker-sample.png)
— the controls' relationship to the search bar is a layout claim only the
running page can settle.
