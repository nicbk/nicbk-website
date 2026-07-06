# Research: Accessibility

Status: fully researched and decided (2026-07-05), 6/6.

Baseline accessibility standard to target, given the mockups are plain and
text-heavy (see [DESIGN.md](../../high-level-guidance/design/DESIGN.md)
mockups), and this is a single/small-team project rather than one with a
legal compliance mandate — so every topic below is scoped proportionately
(Level AA, not AAA; lean on Base UI rather than hand-rolled ARIA; automated
CI checks scoped to critical/serious severity) rather than at
enterprise-compliance depth.

Boundary note: automated *runtime* accessibility testing (what tool, what
it must catch, how strictly it blocks CI) is decided here, in
[testing-and-tooling.md](./testing-and-tooling.md); the test-runner/
framework itself and general test-suite structure remain owed to
[../testing-qa/index.md](../testing-qa/index.md) (not yet researched), same
boundary pattern as
[../project-management-conventions/index.md](../project-management-conventions/index.md)
→ `../devops-deployment/index.md`.

## Topics

- [conformance-target.md](./conformance-target.md) — Decided. WCAG 2.2
  Level AA, site-wide, no per-page exceptions — the numeric/behavioral
  baseline every other topic below derives from.
- [semantic-markup-and-aria-conventions.md](./semantic-markup-and-aria-conventions.md) —
  Decided. Base UI primitives for any widget with a Base UI equivalent
  (no hand-rolled ARIA); native semantic HTML first for plain content;
  mandatory accessible-name convention (`alt`, `aria-label`, `<label>`);
  `aria-live="polite"` for the already-decided toast pattern.
- [color-contrast-and-focus-visibility.md](./color-contrast-and-focus-visibility.md) —
  Decided. 4.5:1 normal text / 3:1 large text and non-text UI, both light
  and dark palettes audited independently; explicit 3:1-contrast,
  ≥2px-perimeter focus indicators (WCAG 2.2 SC 2.4.11) via Base UI's
  `data-focus-visible`; no color-only signaling.
- [keyboard-and-focus-management.md](./keyboard-and-focus-management.md) —
  Decided. No custom focus-trap code (Base UI already handles overlay
  widgets); a site-wide skip-to-main-content link; explicit focus handoff
  to the new page's heading on TanStack Router client-side navigation.
- [motion-and-reduced-motion.md](./motion-and-reduced-motion.md) —
  Decided. Motion is opt-in via
  `prefers-reduced-motion: no-preference`, not opt-out; SSR resolves to
  motion-off by default, reconciled client-side after hydration, so a
  reduced-motion user never sees an unwanted flash of motion.
- [testing-and-tooling.md](./testing-and-tooling.md) — Decided. Biome's
  built-in `a11y` lint rules (correcting an outdated gap claim in
  [../coding-conventions/formatting-and-linting.md](../coding-conventions/formatting-and-linting.md));
  `@axe-core/playwright` in CI for runtime checks, blocking only on
  critical/serious severity; automated tooling explicitly not treated as
  sufficient for full AA conformance (~30% coverage ceiling).
