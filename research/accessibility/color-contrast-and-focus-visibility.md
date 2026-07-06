# Color Contrast & Focus Visibility

Researched: 2026-07-05. Decided: 2026-07-05.

The concrete contrast and focus-indicator requirements that the
already-decided light/dark theme tokens (CSS custom properties, per
[../ui-ux/design-system.md](../ui-ux/design-system.md)'s theming decision and
[../coding-conventions/styling-conventions.md](../coding-conventions/styling-conventions.md)'s
`colors.css` convention) must satisfy. These numbers derive directly from
the [conformance-target.md](./conformance-target.md) decision (WCAG 2.2
Level AA) and close one of the two gaps
[semantic-markup-and-aria-conventions.md](./semantic-markup-and-aria-conventions.md)
identified as left to the consuming app rather than covered by Base UI.

## Decision

- **Text contrast:** at least 4.5:1 for normal text, at least 3:1 for large
  text (≥24px, or ≥19px bold), against its background — WCAG 2.2 SC 1.4.3.
  Applies to both the light and dark token sets independently; a color pair
  passing in one theme doesn't imply it passes in the other.
- **Non-text UI contrast:** at least 3:1 for meaningful graphical objects
  and UI component boundaries — input borders, icons that convey meaning,
  button outlines — against their adjacent color(s), WCAG 2.2 SC 1.4.11.
- **Focus indicator contrast and size:** any focused element's indicator
  must have at least 3:1 contrast against the adjacent color(s), and cover
  an area at least as large as a 2px-thick perimeter around the component
  (or equivalent) — WCAG 2.2 SC 2.4.11 (Focus Appearance, new in 2.2).
  Plain default browser focus outlines are **not** assumed to satisfy this
  automatically in either theme — the focus-ring color/thickness must be
  explicitly authored as part of the color token set, not left to
  user-agent defaults. Base UI exposes a `data-focus-visible` attribute
  (keyboard-only, not on mouse click) as the hook to style this.
- **No color-only signaling:** anywhere state is conveyed by color alone
  (form validation errors, required-field indicators, status badges), a
  second, non-color signal (icon, text label, underline/pattern) is
  included — this composes directly with the inline-form-error pattern
  already decided in [../ui-ux/design-system.md](../ui-ux/design-system.md)'s
  reactive UI feedback section.
- **Action item for implementation:** both the light and dark palettes in
  `colors.css` need to be authored/audited against the above ratios before
  being treated as final — this doc sets the requirement, the actual token
  values are an implementation-time task, not a value decided here.

## Reasoning

- These thresholds are a direct, non-optional consequence of choosing WCAG
  2.2 Level AA in [conformance-target.md](./conformance-target.md) — they
  aren't independently chosen, just the specific SC 1.4.3/1.4.11/2.4.11
  numbers that AA requires.
- SC 2.4.11 (Focus Appearance) is new in WCAG 2.2 and is easy to violate
  by accident precisely because default browser focus outlines often don't
  meet the 3:1/2px bar against arbitrary background colors — calling this
  out explicitly, rather than assuming "the browser handles focus styling,"
  is the reason this is its own decision rather than folded silently into
  the general theming work.
- Requiring both themes to be checked independently (rather than assuming
  one passing implies the other) follows directly from the dark/light mode
  decision in [../ui-ux/design-system.md](../ui-ux/design-system.md) — two
  independent palettes means two independent contrast audits.

## Sources

- [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/) — normative text for SC
  1.4.3, 1.4.11, and 2.4.11.
- [webaim.org/articles/contrast](https://webaim.org/articles/contrast/) —
  practical explanation of contrast ratio calculation and the 4.5:1/3:1
  thresholds.
- [makethingsaccessible.com — contrast requirements for WCAG 2.2 AA](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/) —
  consolidated AA contrast requirements across text and non-text content.
- [yatil.net — WCAG 2.2 visible focus](https://yatil.net/blog/wcag22-visible-focus) —
  detailed explanation of SC 2.4.11's 3:1/2px-perimeter requirement and why
  default browser focus styles often fail it.
