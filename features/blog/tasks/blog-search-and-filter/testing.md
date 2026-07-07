# Testing: Blog Search + Tag Filter

## Unit (Vitest + Testing Library)

- **Pure filter predicate:** given a fixed metadata list and search params,
  returns exactly the posts matching the search text (over title/description/
  tags) **and** the selected tags; empty query returns the full list; ordering
  stays newest-first.
- **Search bar** narrows the rendered list as text is entered (matches in
  title, description, and tags each covered).
- **Tag sidebar:** toggling a tag narrows the list to posts with that tag;
  selecting a second tag multi-selects; de-selecting restores; each tag control
  exposes its pressed/selected state and an accessible name.
- **No-match:** a query matching nothing renders the plain-text empty state.
- The **`validateSearch` schema** parses valid search params and coerces/rejects
  malformed ones (e.g. unexpected shapes) without throwing the page.

## End-to-end (Playwright)

- **URL reflects filter:** typing in the search bar and toggling a tag update
  the **URL search params**; the list narrows accordingly (assert on settled
  DOM and settled URL).
- **Linkable/persistent:** loading a pre-filtered `/blog?...` URL directly
  reproduces the same filtered view; reloading preserves it.
- **History:** back/forward navigates through filter states; live typing does
  not flood history (final state is reachable, intermediate keystrokes don't
  each add an entry).
- **Responsive:** at a mobile viewport the tag sidebar is reflowed below the
  content (or reachable via its drawer toggle) and remains operable.
- **Theming:** search bar and tag controls are correct in both themes with no
  flash.

## Accessibility

- `@axe-core/playwright` inline on `/blog` (with the search/filter UI present)
  passes (critical/serious) in both themes.
- The search field has a discernible accessible name; each tag toggle is
  keyboard operable, has an accessible name, and conveys pressed/collapsed
  state; focus order through search → sidebar → list is sensible; contrast and
  focus indicators meet AA in both themes.

## Not tested here

- Base list rendering, ordering, infinite scroll, draft exclusion (task 2).
- The post page and MDX pipeline (task 1).
