# Motion & Reduced Motion

Researched: 2026-07-05. Decided: 2026-07-05.

How the site handles `prefers-reduced-motion` for any transitions or
animations, and how that interacts with server-side rendering (this stack
uses TanStack Start, per
[../technologies/index.md](../technologies/index.md), which renders on the
server before hydrating on the client).

## Decision

- **Default to no motion; opt in, not opt out.** All transitions/animations
  are gated behind `@media (prefers-reduced-motion: no-preference)` —
  motion only plays for users who have not asked their OS to reduce it.
  This is the inverse of "animate by default, then add a
  `prefers-reduced-motion: reduce` override," which risks momentarily
  showing motion before any override applies.
- **CSS-driven animations/transitions** are guarded directly in the
  relevant component's CSS Module via the media query above — this
  requires no new mechanism, since the CSS Modules approach and
  custom-property token system are already decided in
  [../ui-ux/design-system.md](../ui-ux/design-system.md) and
  [../coding-conventions/styling-conventions.md](../coding-conventions/styling-conventions.md).
- **JS-driven motion** (if any interaction needs it) is gated by a small
  shared `usePrefersReducedMotion` hook wrapping
  `window.matchMedia('(prefers-reduced-motion: reduce)')`, re-evaluated on
  the media query's `change` event so a user who changes the OS setting
  mid-session is respected without a reload.
- **SSR/hydration resolution:** the server cannot know the client's OS
  motion preference on first render. The server-rendered markup always
  defaults to motion-off (the safe direction), and the client reconciles
  the true preference after hydration. This means a
  no-preference (motion-allowed) user may see a brief motion-off first
  paint that resolves to animated shortly after hydration; a
  reduced-motion user's first paint is correctly motion-off from the
  start and never flashes unwanted motion. This asymmetry is intentional —
  it is the direction that never violates the reduced-motion request, at
  the cost of a barely-perceptible one-time flash for the opposite case.

## Reasoning

- Defaulting to no motion (rather than defaulting to motion and disabling
  it) is the standard 2026 recommendation specifically because an
  "animate-by-default" implementation only reliably avoids showing motion
  to a reduced-motion user if every single animated element remembers to
  check the media query — a single miss means real, avoidable harm
  (`prefers-reduced-motion` exists because motion can trigger vestibular
  disorders, not just as a stylistic preference). Inverting the default
  makes omission fail safe instead of fail unsafe.
- The SSR mismatch is unavoidable given the already-decided SSR stack —
  there is no way for server-rendered HTML to know a client-only media
  query's value before the client evaluates it. Resolving the mismatch by
  biasing toward motion-off on the server (rather than motion-on) follows
  directly from the same fail-safe reasoning above.
- This fits into the existing CSS Modules/custom-property system with no
  structural change — a media query per component and one shared hook,
  not a new styling mechanism.

## Sources

- [joshwcomeau.com — prefers-reduced-motion in React](https://www.joshwcomeau.com/react/prefers-reduced-motion/) —
  the `matchMedia`-based hook pattern and the reasoning for
  defaulting-to-off.
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) —
  the media feature itself, its values, and browser support.
