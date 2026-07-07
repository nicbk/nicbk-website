# Constraints and Behavior: Error-Fallback Page

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"Generic error-fallback page" section):

- A top-level render error renders the designed fallback inside `SiteShell`:
  plain-text "something went wrong" + a home link, same tone as the 404 page.
- The underlying error message (and stack where available) is available on
  the page but hidden by default, revealed only on explicit user action via a
  collapsed disclosure. The generic message is never the only possible
  content.
- The fallback is defensive: rendering it does not itself throw (static header
  + plain text only; no data access or risky computation in the boundary).

## Behavior details

- **Wiring:** the root `errorComponent` renders this page inside `SiteShell`;
  the prior placeholder `RootErrorFallback` is removed.
- **Disclosure:** collapsed by default; expanding it reveals the error
  message (and stack if present). Uses a Base UI disclosure primitive if one
  fits, else a native `<details>`; the control has a discernible accessible
  name and is keyboard operable.
- **Defensive rendering:** an `error` with a missing/empty `message` (or no
  stack) still produces a valid page — no crash, no blank detail that breaks
  layout.
- Correct in both themes, keyboard/screen-reader navigable, AA contrast and
  focus visibility.

## Dependencies

- **`site-shell-and-not-found`** — provides `SiteShell` and establishes the
  root-fallback wiring pattern this task follows for `errorComponent`.
- Base UI / tokens / theming from
  [`app-shell-and-home`](../../../app-shell-and-home/description.md).
