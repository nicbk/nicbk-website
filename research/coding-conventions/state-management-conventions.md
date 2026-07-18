# State Management Conventions

Researched: 2026-07-04. Decided: 2026-07-04.

When to reach for local component state vs. TanStack Router's URL/
search-param state vs. Zero's reactive queries — and whether a global
client state library or React Context is needed at all.

## Decision

**No global client state library (no Redux/Zustand/Jotai).** Zero already
owns all persisted/reactive server data via `useQuery`
(see [../system-architecture/reactivity-propagation.md](../system-architecture/reactivity-propagation.md)) —
the "client cache of server state" problem those libraries traditionally
solve doesn't exist here. Nothing else in this project's scope needs a
global store.

**Shareable/bookmarkable UI state → TanStack Router search params.** List
filters, sort order, current tab, pagination, and any other state a user
would reasonably want to link to or navigate back through goes in the
route's search params, validated via a Zod schema on `validateSearch` and
read through the typed `useSearch()` hook — not local component state.

- **Continuously-edited shareable state keeps a local mirror so it stays
  reactive.** For state a user changes continuously — a live search field is
  the canonical case — the URL stays the shareable source of truth, but the
  control ALSO holds the value in local `useState` that drives the UI on every
  keystroke, mirroring to the URL on a short debounce (`replace`, so keystrokes
  don't stack history). The visible result (the filtered list) must render from
  that local value, never wait for the debounced navigation to resolve —
  putting a navigation on the typing hot path makes filtering feel laggy and
  non-reactive. The local copy adopts external URL changes (shared link, back/
  forward, reset) back in, and the mirror is skipped whenever the two already
  agree so the two effects can't ping-pong. The blog implements this in
  `use-blog-filters.ts`. A discrete toggle (a tag button, a tab) needs no local
  mirror — navigating on click is already instant. Note also that a debounced
  URL mirror is a same-page navigation: it must not trigger page-level side
  effects such as the route-change focus handoff (see
  [../accessibility/keyboard-and-focus-management.md](../accessibility/keyboard-and-focus-management.md)).

**Transient, non-shareable UI state → local `useState`.** Anything with no
reason to survive a refresh or be linkable (a dropdown's open/closed state,
a hover tooltip, the editing/non-editing toggle already decided in
[../ui-ux/design-system.md](../ui-ux/design-system.md)'s reactive UI
feedback patterns) is plain local component state — Zero has no built-in
"pause reactive updates while editing" mechanism, so the editing/non-editing
state is necessarily a local `useState<'editing' | 'idle'>`-style toggle
implemented by the app itself.

**Theme preference (dark/light + manual override) bypasses React state
entirely.** An inline `<script>` in the document `<head>` (runs before
hydration) reads `localStorage`/`prefers-color-scheme` and sets
`data-theme` directly on `<html>` before first paint, avoiding a
flash-of-wrong-theme. The toggle control flips the attribute and writes
`localStorage` imperatively (plain DOM calls), not through React
state/Context — the CSS custom properties that key off `[data-theme]`
(per [styling-conventions.md](./styling-conventions.md)) don't care how
the attribute was set.

**Avoid React Context as a default.** No case in this project currently
needs it — theme avoids it via the DOM/localStorage pattern above, server
data goes through Zero, shareable UI state goes through search params.
This is stated as the default to prevent reaching for Context prematurely,
not a permanent ban — revisit if a genuine cross-cutting client-only state
need appears that doesn't fit any of the patterns above.

## Reasoning

- Zero eliminating the traditional global-store use case is a direct
  consequence of already-decided architecture
  ([../system-architecture/reactivity-propagation.md](../system-architecture/reactivity-propagation.md)),
  not a new tradeoff to weigh — introducing a state library on top would be
  solving a problem that doesn't exist in this stack.
- Preferring search params for shareable state follows TanStack's own
  documented philosophy ("search params are state," not just data-fetching
  parameters) and gets deep-linking/bookmarkability/back-button support for
  free, which local state can't provide.
- The theme-preference pattern (inline script + imperative DOM/localStorage,
  no React involved) is a well-established solution to a well-known problem
  (flash-of-wrong-theme on load) — using React state/Context here would add
  complexity without solving anything the simpler pattern doesn't already
  handle.
- Defaulting away from Context (rather than leaving it open-ended) is
  consistent with the project's general avoid-overcomplicating design
  philosophy (per [../ui-ux/design-system.md](../ui-ux/design-system.md))
  — every concrete state need identified for this project already has a
  better-fitting home, so Context would only ever be reached for
  speculatively.

## Sources

- [dailydevpost.com — Zustand vs. Jotai 2026](https://dailydevpost.com/blog/zustand-vs-jotai),
  [zero.rocicorp.dev/docs/react](https://zero.rocicorp.dev/docs/react) —
  confirms Zero's `useQuery` already solves the client-cache-of-server-state
  problem that state libraries are usually reached for.
- [tanstack.com/blog/search-params-are-state](https://tanstack.com/blog/search-params-are-state),
  [tanstack.com/router/latest/docs/how-to/validate-search-params](https://tanstack.com/router/latest/docs/how-to/validate-search-params) —
  search params as first-class, Zod-validated application state.
- [medium.com/@gaisdav — how to prevent theme flash in React](https://medium.com/@gaisdav/how-to-prevent-theme-flash-in-a-react-instant-dark-mode-switching-eb7b6aaa4831),
  [dev.to/mohsenfallahnjd — why MUI avoids theme flash](https://dev.to/mohsenfallahnjd/why-mui-avoids-theme-flash-on-first-load-darklight-mode-4ek) —
  the inline-script-plus-`data-theme`-attribute pattern, bypassing React
  state for theme preference.

## Implementation note

`@tanstack/zod-adapter` (used for `validateSearch`) currently pins to a
Zod 3.x peer dependency; using Zod 4 requires either pinning Zod to
3.25.76 or passing the validation schema directly without the adapter.
Flagging for whenever Zod's version is settled elsewhere in the project —
not a decision this topic needs to make itself.
