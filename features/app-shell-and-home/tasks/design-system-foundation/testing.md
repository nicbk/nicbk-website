# Testing: Design-System Foundation

## Unit (Vitest)

- Theme resolver (a plain function, outside React): returns the OS preference
  when no stored choice exists, returns the stored override when present, and
  the toggle action flips the resolved value and writes it to `localStorage`.
- The inline pre-paint theme script's logic is unit-testable in isolation
  (extract the resolve step into a plain function it and the toggle share).

## End-to-end (Playwright — added/asserted here or deferred to the shell task)

- No flash of the wrong theme on first paint (assert `data-theme` is already
  correct at load, not corrected after hydration).
- Toggling theme persists across a reload.

These e2e assertions require a rendered page; if the app shell/home page do
not yet exist when this task lands, they are written against a minimal test
route and re-pointed at the real pages in a later task. The theme *logic*
unit tests above are the primary gate for this task.

## Accessibility

- The theme toggle has an accessible name and visible focus indicator.
- Token palettes are verified against the 4.5:1 / 3:1 contrast targets in
  both themes (axe covers rendered contrast once pages exist; the palette
  choice is checked at authoring time).

## Not tested here

- Header/navigation and page-content behavior (later tasks).
