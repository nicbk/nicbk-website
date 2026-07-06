# Task: Design-System Foundation

Stand up the cross-cutting styling foundation every page and component uses:
design tokens, the monospace font, light/dark theming with no flash, and the
Base UI + Lucide dependencies.

## What this task does — concretely

- Create `src/styles/colors.css`, `typography.css`, `spacing.css` as
  CSS-custom-property token sets, plus `globals.css` that `@import`s them;
  import `globals.css` once from `__root.tsx`. Light/dark theme values are
  concentrated in `colors.css`, scoped by `[data-theme]`.
- Self-host **JetBrains Mono** (SIL OFL) as the site font — bundled/served by
  the app, no external font-CDN request — and set it as the base family via
  the typography tokens.
- Implement light/dark theming with **no flash of the wrong theme**: an inline
  script in the document head sets `data-theme` before first paint from
  `localStorage` (if set) or `prefers-color-scheme` (otherwise). Theme state
  and toggling live entirely outside React (no Context/state library); a
  minimal, accessible toggle control flips and persists the choice. The
  toggle's final placement on the header/settings surface is refined when
  those exist — this task provides the working mechanism and a usable toggle.
- Set the reduced-motion baseline: motion is opt-in via
  `prefers-reduced-motion: no-preference`; SSR resolves to motion-off so a
  reduced-motion user sees no flash of motion after hydration.
- Add Base UI (`@base-ui-components/react`) and Lucide (`lucide-react`) as
  dependencies and confirm a trivial primitive + icon render and are
  styleable via CSS Modules / `data-*` attributes.
- Establish the responsive baseline conventions (mobile-first, ~768/~1024px
  breakpoints, container queries for reusable components, `clamp()` fluid
  type) as documented token/util conventions ready for later components.

## Not in this task

- The site header, routing shell, or any page content (next tasks).
- Any specific component's styles beyond what proves the foundation works.
