# Semantic Markup & ARIA Conventions

Researched: 2026-07-05. Decided: 2026-07-05.

What semantic HTML/ARIA conventions this project needs on top of what Base
UI (the headless component foundation decided in
[../ui-ux/design-system.md](../ui-ux/design-system.md)) already provides for
free. Base UI's own documentation treats accessibility as a first-class
design goal — its primitives ship correct ARIA roles/states, keyboard
interaction patterns, and screen-reader behavior out of the box, tested
against the WAI-ARIA Authoring Practices patterns. That means this topic is
deliberately narrow: it only needs to cover what Base UI explicitly leaves
to the consuming app, plus plain content that never goes through a Base UI
primitive at all (the blog, the home/about pages).

## Decision

- **Any interactive widget with a Base UI equivalent (dialog, popover,
  menu, tabs, switch, select, etc.) is built with that primitive**, never
  hand-rolled from plain `<div>`s with custom ARIA. Re-implementing ARIA
  roles/states/keyboard handling that Base UI already provides correctly is
  pure duplicated effort and a likely source of subtle bugs (per
  [AGENTS.md](../../AGENTS.md)'s "Avoid duplication").
- **Plain content (not going through Base UI) uses native semantic HTML
  elements first**, before reaching for ARIA roles: `<button>` over
  `role="button"` on a `<div>`, `<nav>`/`<header>`/`<main>`/`<footer>` for
  page structure, `<ul>`/`<ol>`/`<li>` for lists, real `<table>` markup for
  tabular data, proper heading hierarchy (`<h1>`-`<h6>`, one `<h1>` per
  page). ARIA is only reached for when native HTML genuinely can't express
  the semantics needed (e.g. `aria-live` regions for toast notifications,
  see below).
- **Accessible-name convention, mandatory on every instance:**
  - Every `<img>` that conveys content gets a real `alt` attribute (empty
    `alt=""` only for genuinely decorative images).
  - Every icon-only interactive control (icon buttons, close buttons) gets
    an `aria-label` describing its action, since there's no visible text
    for an accessible name to derive from.
  - Every form input gets an associated `<label>` (via `htmlFor`/`id`), not
    a `placeholder` used as a substitute — placeholder text disappears on
    input and isn't a reliable accessible name.
- **`aria-live="polite"` for the toast notification pattern** already
  decided in [../ui-ux/design-system.md](../ui-ux/design-system.md)'s
  reactive UI feedback section (errors outside a form context) — this is
  the one concrete case in this project where plain HTML has no native
  equivalent and ARIA is the correct tool, not a workaround.

## Reasoning

- Base UI's accessibility guarantees only hold for the surface it actually
  covers (its own primitives). The gaps it explicitly leaves to the
  consuming application — accessible names, contrast, focus-indicator
  styling — are exactly the accessible-name convention here plus the
  separate [color-contrast-and-focus-visibility.md](./color-contrast-and-focus-visibility.md)
  and [keyboard-and-focus-management.md](./keyboard-and-focus-management.md)
  topics, so this document deliberately doesn't re-litigate anything Base
  UI already handles.
- "Semantic HTML first, ARIA last" is standard, uncontested accessibility
  practice precisely because incorrect ARIA (a role or state that doesn't
  match the element's actual behavior) is worse for assistive technology
  users than no ARIA at all — native elements come with correct behavior
  built in and can't drift out of sync with a hand-maintained `aria-*`
  attribute.
- Scoping this topic to "what Base UI doesn't cover" rather than writing a
  general ARIA rulebook keeps the document proportionate to this project's
  actual surface area (mostly plain content pages plus a handful of Base
  UI-driven interactive widgets), consistent with the project's stated
  preference for low-friction, non-overcomplicated conventions.

## Sources

- [base-ui.com/react/overview/accessibility](https://base-ui.com/react/overview/accessibility) —
  Base UI's own accessibility guarantees: ARIA roles/states, keyboard
  interaction, and screen-reader testing built into its primitives.
- [infoq.com — Base UI 1.0](https://www.infoq.com/news/2026/02/baseui-v1-accessible/) —
  independent coverage confirming Base UI's accessibility-first design
  goal at its 1.0 release.
- [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/) — general WCAG 2.2
  guidance on semantic structure and accessible names (also the source for
  [conformance-target.md](./conformance-target.md)).
