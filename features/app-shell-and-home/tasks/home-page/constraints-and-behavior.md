# Constraints and Behavior: Home Page

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"Home page" section):

- The home page at `/` displays exactly the two static lines from
  `home-page.png` (`who: ...` / `doing: ...`), with no dynamic data and no
  layout elements beyond the shared header.
- It has a correct document heading structure and is fully keyboard- and
  screen-reader-navigable.

## Behavior details

- The content is static and identical on every load — no fetching, no
  reactive subscription, no empty/loading state (there is no data).
- The page renders inside the sticky header shell and inherits its theming;
  it looks correct in both light and dark themes.
- The page exposes a main heading that the shell's post-navigation focus
  handoff can move focus to.

## Dependencies

- Requires the shell + header (`app-shell-and-header`) and the design tokens
  (`design-system-foundation`).
