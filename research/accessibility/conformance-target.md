# Conformance Target

Researched: 2026-07-05. Decided: 2026-07-05.

The baseline accessibility standard the whole site targets, given the
mockups are plain, text-heavy, and monospace (see
[DESIGN.md](../../high-level-guidance/design/DESIGN.md)) and this is a
single/small-team project rather than an enterprise with a legal compliance
mandate. This decision sets the concrete numeric thresholds used throughout
the rest of this category, most directly in
[color-contrast-and-focus-visibility.md](./color-contrast-and-focus-visibility.md).

## Decision

**WCAG 2.2 Level AA, applied site-wide with no per-page exceptions.**

- **Level AA**, not AAA. AAA is not adopted as a blanket policy anywhere —
  the W3C's own guidance advises against mandating AAA site-wide, since
  several AAA criteria are impossible or actively harmful to satisfy for
  all content types at once (e.g. some AAA contrast/language-level criteria
  conflict with normal editorial content). AA is the de facto legal and
  industry conformance benchmark and covers the criteria that block or
  seriously degrade use for people with disabilities.
- **WCAG 2.2** (the current version), not 2.1. 2.2 is a strict superset of
  2.1 at the AA level and adds a handful of new AA criteria — most notably
  Focus Appearance (2.4.11), which is load-bearing for
  [keyboard-and-focus-management.md](./keyboard-and-focus-management.md)
  and [color-contrast-and-focus-visibility.md](./color-contrast-and-focus-visibility.md) —
  so targeting 2.2 rather than 2.1 costs nothing extra and captures those.
- Applies uniformly across the main site and every sub-application (e.g.
  the Academic Literature Tracker), not scoped down per sub-app.

## Reasoning

- Given the design philosophy already established in
  [../ui-ux/design-system.md](../ui-ux/design-system.md) (simplicity,
  low-friction, avoid overcomplicating unless it clearly serves the user),
  AA is the right proportionality point: it removes the barriers that
  actually stop someone from using the site, without chasing AAA criteria
  that the W3C itself doesn't recommend as a universal target and that
  would add effort disproportionate to a personal site's scale.
- Choosing the AA bar up front (rather than an informal "reasonable effort"
  standard) gives every other topic in this category, and any future
  design/implementation work, an unambiguous, checkable target instead of a
  subjective one.

## Sources

- [w3.org/WAI/WCAG2AA-Conformance](https://www.w3.org/WAI/WCAG2AA-Conformance) —
  W3C's own page on what AA conformance means and why AAA isn't recommended
  as a blanket site-wide target.
- [levelaccess.com — ADA compliance levels explained](https://www.levelaccess.com/blog/ada-compliance-levels/) —
  A/AA/AAA level comparison and why AA is the standard legal/industry
  benchmark.
- [wcagpros.com — WCAG AA vs. AAA](https://wcagpros.com/wcag-guidelines/the-great-debate-wcag-aa-vs-aaa-explained/) —
  concrete criteria differences between AA and AAA.
