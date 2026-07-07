# Testing: Error-Fallback Page

## Unit (Vitest + Testing Library)

- The error page renders "something went wrong" and a home link with the
  correct href, inside the header/`<main>` (via `SiteShell`), with a main
  heading.
- The technical detail is **not** shown by default; activating the disclosure
  reveals it, and given an error the revealed content includes the error
  message.
- **Defensive rendering:** an error with an empty/missing `message` (and no
  stack) still renders a valid page (no throw, no broken detail region).

## End-to-end (Playwright)

- A route/hook forced to throw (test-only trigger) renders the fallback inside
  the header; the disclosure is collapsed initially and expands on
  activation, showing the error text.
- No production route is left able to error on demand (the trigger exists only
  in the test setup).
- Theming: no flash; correct in both themes.

## Accessibility

- `@axe-core/playwright` inline on the error page passes (critical/serious) in
  both themes.
- The disclosure control has a discernible accessible name, is keyboard
  operable, and its expanded/collapsed state is conveyed; heading structure
  valid; contrast/focus meet AA.

## Not tested here

- The 404 page, the `SiteShell` extraction, and the personal-site refactor
  regression (task 1).
