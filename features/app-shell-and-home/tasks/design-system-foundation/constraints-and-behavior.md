# Constraints and Behavior: Design-System Foundation

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"Design system" section, plus the relevant cross-cutting quality items):

- Shared CSS-custom-property tokens (colors, typography, spacing) exist in
  `src/styles/`, are imported once from `__root.tsx`, and are the source
  components pull from.
- The site renders in self-hosted JetBrains Mono with no external font
  request.
- Light and dark themes exist, default to `prefers-color-scheme`, are
  overridable by a persistent toggle, are applied via `data-theme` set before
  first paint (**no flash**), and persist across reloads via `localStorage`;
  theming does not go through React state.
- Motion is opt-in via `prefers-reduced-motion: no-preference` with no
  post-hydration flash of motion for reduced-motion users.
- Base UI is the primitive library and Lucide the icon set, both wired in.
- Contrast meets 4.5:1 text / 3:1 non-text in **both** themes (the token
  palettes are chosen to satisfy this), and focus-visible styling via Base
  UI `data-focus-visible` meets ≥2px / 3:1.

## Behavior details

- On a fresh visit with no stored preference, the theme matches the OS
  setting; after the user toggles, the chosen theme is restored on the next
  visit regardless of OS setting.
- The theme is correct on the very first painted frame (server-rendered
  markup + the pre-paint inline script), never flipping visibly after
  hydration.
- No color-only signaling is introduced by any token or utility.
