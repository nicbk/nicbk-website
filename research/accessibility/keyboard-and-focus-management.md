# Keyboard & Focus Management

Researched: 2026-07-05. Decided: 2026-07-05.

What keyboard navigation and focus management this project needs to
implement itself, versus what Base UI (decided in
[../ui-ux/design-system.md](../ui-ux/design-system.md)) already provides for
its own components. This is the second of the two concrete gaps
[semantic-markup-and-aria-conventions.md](./semantic-markup-and-aria-conventions.md)
identified as left to the consuming app.

## Decision

- **No custom focus-trap code.** Base UI's Dialog, Popover, Menu, and
  similar overlay primitives already trap focus within themselves while
  open, cycle correctly on Tab/Shift+Tab, close on Escape, and restore
  focus to the triggering element on close. This is not re-implemented
  anywhere in the app.
- **Site-wide "Skip to main content" link**, visually hidden until it
  receives keyboard focus, placed as the first focusable element in the
  root layout, targeting the page's `<main>` landmark. This is not provided
  by Base UI (it has no opinion on page-level layout) and has to be built
  once at the shared layout level.
- **Explicit focus management on client-side page changes.** TanStack
  Router navigation (per the stack already decided in
  [../technologies/index.md](../technologies/index.md)) swaps content
  without a full page reload, so the browser does not automatically move
  focus anywhere — it can be left on a trigger element that no longer
  exists in the DOM, silently stranding keyboard/screen-reader users. On
  every navigation **to a different page**, focus is moved programmatically
  to the new page's primary heading (or the `<main>` landmark itself, given
  a `tabindex="-1"` for this purpose), and scroll position resets to the top.
  - This is scoped to a change of **pathname**, not any URL change. A
    same-page update to the URL's search params — how shareable in-page state
    such as the blog's live search text and tag filters is stored (see
    [../coding-conventions/state-management-conventions.md](../coding-conventions/state-management-conventions.md)) —
    is *not* a page change and must **leave focus where it is**. Handing focus
    to the heading on every keystroke or tag toggle would itself strand the
    person filtering, the exact failure the handoff exists to prevent. The
    router keys the handoff on `pathname` (`isPageNavigation` in
    `src/focus-handoff.ts`) precisely to draw this line.
- **All interactive elements are operable via keyboard alone** — Tab order
  follows visual/reading order, Enter/Space activate buttons, Escape closes
  overlays, arrow keys navigate composite widgets (menus, tabs) per the
  ARIA Authoring Practices pattern each Base UI primitive already
  implements. Verifying this is a manual check (keyboard-only pass through
  each page/flow), folded into the existing self-review and human-review
  gates from
  [../project-management-conventions/review-process.md](../project-management-conventions/review-process.md)
  rather than a new review step — the automated half of testing is covered
  separately in [testing-and-tooling.md](./testing-and-tooling.md).

## Reasoning

- Skip links and SPA route-change focus loss are the two most commonly
  cited real-world keyboard-accessibility failures in React/client-routed
  apps specifically because no component library or router provides them
  automatically by default — they depend on knowing where the app's own
  layout and routing boundaries are, which is unavoidably app-specific
  work.
- Not re-implementing focus trapping (already correct in Base UI) follows
  [AGENTS.md](../../AGENTS.md)'s "Avoid duplication" guidance directly —
  the risk of a hand-rolled focus trap regressing relative to Base UI's
  tested implementation outweighs any benefit of writing one.
- Folding manual keyboard verification into the existing review gates
  (rather than inventing a fourth gate) keeps this consistent with
  [../project-management-conventions/review-process.md](../project-management-conventions/review-process.md)'s
  already-decided three-gate structure.

## Sources

- [uxpin.com — accessible modals with focus traps](https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/) —
  focus-trap/restore-on-close pattern, and which UI libraries provide it
  natively.
- [oneuptime.com — focus management in React SPAs](https://oneuptime.com/blog/post/2026-01-15-focus-management-react-spa/view) —
  the client-side-routing focus-loss problem and the heading/`main`-focus
  fix pattern.
- [freecodecamp.org — keyboard accessibility for complex React experiences](https://www.freecodecamp.org/news/designing-keyboard-accessibility-for-complex-react-experiences/) —
  general keyboard-operability requirements for composite widgets.
