# Feature: Error and Not-Found Pages

The two site-wide fallback pages — the **404 / not-found** page for unmatched
routes and the **generic error-fallback** page for a top-level render error —
each rendered inside the real site header, replacing the bare-`<main>`
placeholders that
[`app-shell-and-home`](../app-shell-and-home/description.md) deliberately left
in `__root.tsx` for this feature.

Concretely, this feature produces:

- A reusable **`SiteShell`** — the sticky site header plus the
  `<main id="main-content" tabIndex={-1}>` landmark — extracted so the
  personal-site layout and both fallback pages render inside the *same* shell
  instead of duplicating that wrapper. Today the header + `<main>` live only
  in `(personal-site)/route.tsx`, which is why the root-level fallback
  components currently render headerless.
- The **404 / not-found page**: plain-text "page not found" (no numeric
  code) and a link home, in the same minimalist style as the home/about
  pages, served with a real **HTTP 404** status.
- The **generic error-fallback page**: plain-text "something went wrong" and
  a link home, with an **opt-in technical-detail** surface (the underlying
  error message/stack), hidden by default.

Both are wired through the root route's existing `notFoundComponent` /
`errorComponent` hooks.

## Scope boundary

Static presentation only — no data layer, auth, or reactive data. This
feature is distinct from the per-component loading/error/empty states under
the design system's "Reactive UI feedback patterns" (those belong to the
data-backed features that render them); this is the *top-level*, whole-page
fallback pair.

The app shell, header, design tokens, theming, skip link, and focus handoff
this feature builds on already exist from `app-shell-and-home` and are reused
(the header is factored into `SiteShell`, not rebuilt).

## Dependency note

Sequential after — and lightly refactoring — `app-shell-and-home`: it
extracts `SiteShell` out of that feature's `(personal-site)/route.tsx` and
fills in the `notFoundComponent`/`errorComponent` placeholders that feature
left in `__root.tsx`. Parallelism with other Phase-1 features is not a goal
(see [feature notes in](../index.md) the roadmap); this feature is scoped to
be implemented well on its own terms.
