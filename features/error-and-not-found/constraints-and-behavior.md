# Constraints and Behavior: Error and Not-Found Pages

Acceptance criteria for the feature as a whole. Each task's own
`constraints-and-behavior.md` states which of these it satisfies.

## Shared shell

- A reusable `SiteShell` renders the sticky site header and the
  `<main id="main-content" tabIndex={-1}>` landmark around its children.
- `(personal-site)/route.tsx` uses `SiteShell` with **no change to its
  rendered output** (same header, same focusable `<main>`, same skip-link /
  focus-handoff targets as before).
- There is exactly one definition of the header+`<main>` wrapper; the 404
  page, the error page, and the personal-site layout all render through it.

## 404 / Not-found page

- An unmatched route renders the designed 404 inside `SiteShell`: plain-text
  **"page not found"** (no numeric "404" shown) and a link back to the home
  page, in the same minimalist plain-text style as the home/about pages.
- The response carries a real **HTTP 404** status on server render (not 200),
  so the not-found state is correct for crawlers/clients, not just visually.
- The page has a valid main heading that the skip link / focus handoff can
  target.

## Generic error-fallback page

- A top-level render error renders the designed fallback inside `SiteShell`:
  plain-text **"something went wrong"** and a link home, same tone as the 404
  page.
- **Optional technical detail**: the underlying error message (and stack
  where available) is available on the page but **hidden by default**,
  revealed only on explicit user action (a collapsed disclosure). The generic
  message is never the *only* possible content — the capability to surface
  detail exists rather than being hardcoded away.
- The fallback is defensive: rendering it must not itself throw (it shows the
  static header and plain text only; no data access or risky computation in
  the boundary).

## Cross-cutting quality

- Both pages render correctly in light and dark themes with no flash, inside
  the sticky header, and are fully keyboard- and screen-reader-navigable.
- WCAG 2.2 AA: text/link contrast in both themes, visible focus indicators,
  a discernible name on the disclosure control, valid heading structure.
- Runs identically under `npm run dev` and `docker compose up`; CI (Biome,
  typecheck, unit tests with ratchet coverage, Playwright e2e + axe, PR-title
  lint) passes.

## Explicitly out of scope

- Any data-layer service, auth, or reactive data.
- Per-component loading/error/empty states (the design system's "Reactive UI
  feedback patterns") — those belong to the data-backed features.
- Custom per-route error boundaries beyond the top-level one (not needed
  until a feature has a route-specific failure mode to handle).
