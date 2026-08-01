# Testing: Projects Page

Testing requirements for the feature as a whole, per the decided testing tiers
(see [research.md](./research.md) for citations). The single task's
`testing.md` states the concrete tests it must add.

## Tiers in play

No data layer and no server logic, so the **integration tier**
(Testcontainers Postgres/Garage) does not apply. Coverage is unit + e2e +
inline accessibility.

## Unit (Vitest + `@testing-library/react`, jsdom)

- The page exposes **exactly one `<h1>`**, reading "projects" — the structural
  and focus-handoff requirement every page in this site shares.
- The Literature Tracker entry renders with **both** its name and its
  description.
- The entry exposes **no link role** — the guard on the "text, not a link
  yet" decision, so the entry cannot silently regain a dead link.
- The list is exposed as a **list** with its items, not as loose text.

## End-to-end (Playwright)

- **Smoke**: `/projects` loads inside the shell (header visible) and shows the
  "projects" heading and the entry.
- **Navigation**: reaching `/projects` from the header's `projects` link lands
  on the real page (already asserted in `shell.spec.ts`, which also checks the
  focus handoff onto the heading — that test must keep passing against the real
  page rather than the placeholder).
- **No dead link**: the page contains no link pointing at a Literature Tracker
  URL.
- **Narrow viewport**: no horizontal page overflow at a mobile width.
- **Theming**: correct in both themes, with no flash of the wrong theme
  (reuses the shared theming assertions).

## Accessibility

- `@axe-core/playwright` runs inline on `/projects` in **both themes**,
  blocking on critical/serious findings.
- Heading structure is valid; the muted description meets AA contrast in both
  themes.

## Coverage / gating

- Vitest `v8` coverage, unit-only, ratchet-style (must not drop PR-over-PR).

## Manual verification

Per [AGENTS.md](../../AGENTS.md), the page is checked in Chrome against its
spec — both themes, narrow/mid/wide widths, scrolled through — not merely
asserted on by tests.

## Framework caveat to carry

The same flagged TanStack Start + Playwright hydration/routing-timing
flakiness as every other page feature: assert on settled DOM state, don't race
hydration.
